require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose = require('mongoose')

const CATEGORIES = {
  'Film & Video':           ['Actor','Assistant Director','Boom Operator','Camera Operator','Director','DOP','Editor','Film Producer','Filmmaker','Focus Puller','Gaffer','Grip','Script Supervisor','Set Designer','Sound Designer','Steadicam Operator'],
  'Visual Arts':            ['3D Artist','Art Director','Artist','CGI Artist','Character Artist','Comic Artist','Digital Artist','Fine Artist','Generative Media Artist','Graphic Designer','Illustrator','Installation Artist','Interactive Designer','Kinetic Artist','Mural Painter','New Media Artist','Painter','Performance Artist','Photographer','Printmaker','Sculptor','Visual Artist','Visual Effects Artist'],
  'Design & Architecture':  ['Architect','Environmental Designer','Exhibit Designer','Fashion Designer','Furniture Designer','Industrial Designer','Interior Designer','Jewelry Designer','Landscape Designer','Lighting Designer','Production Designer','Textile Designer','UX/UI Designer','Web Designer'],
  'Music & Audio':          ['A&R','DJ','Guitarist','Jingle Writer','Music Manager','Music Producer','Musician','Pianist','Radio Producer','Rapper','Recording Artist','Singer','Songwriter','Topliner'],
  'Content & Writing':      ['Blogger','Broadcaster','Content Creator','Copywriter','Creative Writer','Journalist','Narrative Designer','Podcaster','Technical Writer','Writer'],
  'Marketing & Events':     ['Advertiser','Branding Expert','Event Planner','Marketer','Promoter','Public Speaker','Social Media Marketer'],
  'Beauty & Styling':       ['Costume Designer','Hair Stylist','Makeup Artist','Stylist'],
  'Animation & Gaming':     ['Animator','Game Designer','Video Game Designer'],
  'Performance & Dance':    ['Choreographer','Dancer','Performer'],
  'Traditional Arts':       ['Knitter','Potter','Quilter','Textile Artist'],
  'Production & Management':['Creative Director','Producer']
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI)
  const col = mongoose.connection.db.collection('tags')

  let updated = 0
  let order   = 0

  for (const [category, tagNames] of Object.entries(CATEGORIES)) {
    for (const name of tagNames) {
      const res = await col.updateOne({ name }, { $set: { category, categoryOrder: order } })
      if (res.matchedCount) updated++
      else console.warn(`  ✗ Not found in DB: "${name}"`)
    }
    order++
  }

  console.log(`Updated ${updated} tags with category info`)

  // Print current counts by category to verify
  const all = await col.find({}).toArray()
  const grouped = {}
  all.forEach(t => {
    const c = t.category || 'Uncategorised'
    grouped[c] = (grouped[c] || 0) + 1
  })
  console.log('\nTag counts by category:')
  Object.entries(grouped).forEach(([c, n]) => console.log(`  ${c}: ${n}`))

  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
