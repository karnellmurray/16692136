const bcrypt        = require('bcryptjs')
const Signup        = require('../models/Signup')
const { presignAvatar } = require('../config/aws')
const { normalisePhone } = require('../utils/phone')

exports.getMembers = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1)
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12))
    const skip   = (page - 1) * limit

    const filter = {}

    if (req.query.category) {
      const db          = require('mongoose').connection.db
      const categoryTags = await db.collection('tags').find({ category: req.query.category }, { projection: { name: 1, _id: 0 } }).toArray()
      filter.tags = { $in: [req.query.category, ...categoryTags.map(t => t.name)] }
    } else if (req.query.tag) {
      filter.tags = req.query.tag
    }

    if (req.query.search) {
      const regex = new RegExp(req.query.search.trim(), 'i')
      filter.$or = [
        { name: regex },
        { bio:  regex },
        { tags: regex }
      ]
    }

    const [members, total] = await Promise.all([
      Signup.find(filter)
            .select('-email -passwordHash -phone')
            .skip(skip)
            .limit(limit)
            .lean(),
      Signup.countDocuments(filter)
    ])

    await Promise.all(members.map(async m => {
      if (m.avatar?.url) m.avatar.url = await presignAvatar(m.avatar.url)
    }))

    res.json({
      members,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (err) {
    console.error('getMembers error:', err)
    res.status(500).json({ error: 'Failed to fetch members' })
  }
}

exports.getSpotlightMember = async (req, res) => {
  try {
    const [member] = await Signup.aggregate([
      { $sample: { size: 1 } },
      { $project: { email: 0, passwordHash: 0, phone: 0 } }
    ])

    if (!member) return res.json({ member: null })

    if (member.avatar?.url) {
      member.avatar.url = await presignAvatar(member.avatar.url)
    }

    res.json({ member })
  } catch (err) {
    console.error('getSpotlightMember error:', err)
    res.status(500).json({ error: 'Failed to fetch spotlight member' })
  }
}

exports.getFeaturedMembers = async (req, res) => {
  try {
    const members = await Signup.aggregate([
      { $sample: { size: 5 } },
      { $project: { email: 0, passwordHash: 0, phone: 0 } }
    ])

    await Promise.all(members.map(async m => {
      if (m.avatar?.url) m.avatar.url = await presignAvatar(m.avatar.url)
    }))

    res.json({ members })
  } catch (err) {
    console.error('getFeaturedMembers error:', err)
    res.status(500).json({ error: 'Failed to fetch featured members' })
  }
}

exports.getMemberByUsername = async (req, res) => {
  try {
    const member = await Signup.findOne({ username: req.params.username.toLowerCase() })
                             .select('-passwordHash -email -phone')
                             .lean()

    if (!member) {
      return res.status(404).json({ error: 'Member not found' })
    }

    if (member.avatar?.url) {
      member.avatar.url = await presignAvatar(member.avatar.url)
    }

    res.json({ member })
  } catch (err) {
    console.error('getMemberByUsername error:', err)
    res.status(500).json({ error: 'Failed to fetch member' })
  }
}

exports.getDisciplines = async (req, res) => {
  try {
    const db   = require('mongoose').connection.db
    const tags = await db.collection('tags').find({}).sort({ categoryOrder: 1, order: 1 }).toArray()

    // Group tags by category
    const catMap = {}
    tags.forEach(t => {
      const cat = t.category || 'Other'
      if (!catMap[cat]) catMap[cat] = { name: cat, tags: [], order: t.categoryOrder ?? 99 }
      catMap[cat].tags.push(t.name)
    })

    // Count members per category (members with at least one matching tag)
    const categories = await Promise.all(
      Object.values(catMap).map(async cat => {
        const count = await Signup.countDocuments({ tags: { $in: cat.tags } })
        return { name: cat.name, tags: cat.tags, count }
      })
    )

    categories.sort((a, b) => a.order - b.order)

    res.json({ disciplines: categories })
  } catch (err) {
    console.error('getDisciplines error:', err)
    res.status(500).json({ error: 'Failed to fetch disciplines' })
  }
}

exports.checkAvailability = async (req, res) => {
  const { field, value } = req.query
  if (!field || !value || !['username', 'email', 'phone'].includes(field)) {
    return res.status(400).json({ error: 'Invalid request' })
  }
  try {
    const exists = field === 'phone'
      ? await Signup.exists({ phone: normalisePhone(value) })
      : await Signup.exists({ [field]: { $regex: new RegExp(`^${value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } })
    res.json({ available: !exists })
  } catch (err) {
    res.status(500).json({ error: 'Check failed' })
  }
}

exports.getStats = async (req, res) => {
  try {
    const db = require('mongoose').connection.db
    const [totalMembers, totalDisciplines, totalCollabs] = await Promise.all([
      Signup.countDocuments(),
      db.collection('tags').countDocuments(),
      db.collection('projects').countDocuments({ 'collaborators.0': { $exists: true } })
    ])

    res.json({
      totalMembers,
      totalCollabs,
      disciplines: totalDisciplines
    })
  } catch (err) {
    console.error('getStats error:', err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
}

const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_RE = /^[a-z0-9_]{3,20}$/
const PHONE_RE    = /^[\d\s\+\-\(\)]{7,20}$/

exports.submitSignup = async (req, res) => {
  try {
    const { name, username, email, password, tags, location, phone } = req.body

    if (!name || !username || !email || !password || !location || !phone) {
      return res.status(400).json({ error: 'All fields are required.' })
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' })
    }
    if (!USERNAME_RE.test(username.toLowerCase())) {
      return res.status(400).json({ error: 'Username must be 3–20 characters and contain only letters, numbers, or underscores.' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' })
    }
    if (!PHONE_RE.test(phone)) {
      return res.status(400).json({ error: 'Please enter a valid phone number.' })
    }
    if (!Array.isArray(tags) || !tags.length) {
      return res.status(400).json({ error: 'Please pick at least one tag.' })
    }

    const uLower = username.toLowerCase().trim()
    const eLower = email.toLowerCase().trim()
    const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const normPhone = normalisePhone(phone)
    const [takenUser, takenEmail, takenPhone] = await Promise.all([
      Signup.findOne({ username: { $regex: new RegExp(`^${escape(uLower)}$`, 'i') } }),
      Signup.findOne({ email:    { $regex: new RegExp(`^${escape(eLower)}$`, 'i') } }),
      Signup.findOne({ phone:    normPhone }),
    ])
    if (takenUser)  return res.status(409).json({ error: 'This username is already taken.',             field: 'username' })
    if (takenEmail) return res.status(409).json({ error: 'This email has already been used to apply.',  field: 'email'    })
    if (takenPhone) return res.status(409).json({ error: 'This phone number is already registered.',    field: 'phone'    })

    const passwordHash = await bcrypt.hash(password, 12)
    const signup = new Signup({ name, username: uLower, email: eLower, passwordHash, tags: tags.slice(0, 4), location, phone: normPhone })
    await signup.save()

    const totalMembers = await Signup.countDocuments()
    res.status(201).json({ message: 'Application received', totalMembers })
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || err.keyValue || {})[0]
      const messages = {
        username: 'This username is already taken.',
        email:    'This email has already been used to apply.',
        phone:    'This phone number is already registered.',
      }
      return res.status(409).json({
        error: messages[field] || 'A duplicate value was found.',
        field: field || 'unknown',
      })
    }
    console.error('submitSignup error:', err)
    res.status(500).json({ error: 'Failed to save application' })
  }
}