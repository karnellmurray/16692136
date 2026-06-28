require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose = require('mongoose')

const tags = [
  'Actor', 'Advertiser', 'Animator', 'Architect', 'A&R', 'Artist',
  '3D Artist', 'Art Director', 'Assistant Director', 'Blogger',
  'Boom Operator', 'Branding Expert', 'Broadcaster', 'Camera Operator',
  'CGI Artist', 'Character Artist', 'Choreographer', 'Comic Artist',
  'Content Creator', 'Costume Designer', 'Creative Director',
  'Creative Writer', 'Copywriter', 'Dancer', 'Digital Artist', 'Director',
  'DOP', 'DJ', 'Editor', 'Event Planner', 'Exhibit Designer',
  'Environmental Designer', 'Fashion Designer', 'Filmmaker', 'Film Producer',
  'Fine Artist', 'Focus Puller', 'Furniture Designer', 'Gaffer',
  'Game Designer', 'Generative Media Artist', 'Graphic Designer', 'Grip',
  'Guitarist', 'Hair Stylist', 'Illustrator', 'Industrial Designer',
  'Installation Artist', 'Interactive Designer', 'Interior Designer',
  'Jewelry Designer', 'Jingle Writer', 'Journalist', 'Kinetic Artist',
  'Knitter', 'Landscape Designer', 'Lighting Designer', 'Makeup Artist',
  'Marketer', 'Music Manager', 'Music Producer', 'Musician', 'Mural Painter',
  'Narrative Designer', 'New Media Artist', 'Painter', 'Performance Artist',
  'Performer', 'Photographer', 'Pianist', 'Podcaster', 'Potter',
  'Printmaker', 'Producer', 'Production Designer', 'Promoter',
  'Public Speaker', 'Quilter', 'Radio Producer', 'Rapper', 'Recording Artist',
  'Script Supervisor', 'Set Designer', 'Sculptor', 'Singer',
  'Social Media Marketer', 'Sound Designer', 'Songwriter', 'Stylist',
  'Steadicam Operator', 'Technical Writer', 'Textile Artist',
  'Textile Designer', 'Topliner', 'UX/UI Designer', 'Video Game Designer',
  'Visual Artist', 'Visual Effects Artist', 'Web Designer', 'Writer'
]

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB')

  const db = mongoose.connection.db
  const collection = db.collection('tags')

  await collection.deleteMany({})

  const docs = tags.map((name, i) => ({ name, order: i }))
  await collection.insertMany(docs)

  console.log(`Inserted ${docs.length} tags`)
  await mongoose.disconnect()
}

seed().catch(err => { console.error(err); process.exit(1) })
