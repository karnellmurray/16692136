import mongoose from 'mongoose'

const { Schema } = mongoose
const ObjectId   = Schema.Types.ObjectId

const CollaboratorSchema = new Schema({
  user: { type: ObjectId, ref: 'Signup' },
  role: String,
}, { _id: false })

const ChapterSchema = new Schema({
  title:       { type: String, required: true },
  status:      { type: String, enum: ['todo', 'active', 'done'], default: 'todo' },
  completedAt: Date,
})

const CollabSlotSchema = new Schema({
  role:        { type: String, required: true },
  description: String,
  filled:      { type: Boolean, default: false },
  filledBy:    { type: ObjectId, ref: 'Signup' },
})

const ProjectSchema = new Schema({
  // Identity
  title:         { type: String, required: true },
  slug:          { type: String, required: true, unique: true },
  creator:       { type: ObjectId, ref: 'Signup', required: true },
  collaborators: [CollaboratorSchema],

  // Categorisation
  disciplines: [{ type: String }],
  tags:        [String],
  location: String,

  // Content
  tagline:     String,
  description: String,
  coverImage:         String,
  coverImagePosition: { type: String, default: '50% 50%' },

  // Chapter system
  chapters: [ChapterSchema],
  progress: { type: Number, default: 0, min: 0, max: 100 },

  status: {
    type: String,
    enum: ['active', 'completed', 'on-hold', 'abandoned'],
    default: 'active',
  },

  // Social
  followers:     [{ type: ObjectId, ref: 'Signup' }],
  followerCount: { type: Number, default: 0 },

  // Collaborator needs
  collaboratorsNeeded:      { type: Boolean, default: false },
  collaboratorDisciplines:  [String],

  // Collab slots — referenced by bulletin posts
  openCollabSlots: [CollabSlotSchema],

  // Timestamps
  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now },
  lastPostAt: Date,
})

// Always re-register so hot-reload picks up schema changes
if (mongoose.models['Project']) mongoose.deleteModel('Project')
export default mongoose.model('Project', ProjectSchema)
