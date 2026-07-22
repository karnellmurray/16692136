import mongoose from 'mongoose'

const { Schema } = mongoose
const ObjectId   = Schema.Types.ObjectId

const ProjectPostSchema = new Schema({
  project: { type: ObjectId, ref: 'Project',  required: true },
  author:  { type: ObjectId, ref: 'Signup',   required: true },

  type: {
    type: String,
    enum: ['update', 'media', 'milestone'],
    required: true,
  },

  content:    String,
  media:      [String],
  chapterRef: String,

  likes:        [{ type: ObjectId, ref: 'Signup' }],
  likeCount:    { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
})

if (mongoose.models['ProjectPost']) mongoose.deleteModel('ProjectPost')
export default mongoose.model('ProjectPost', ProjectPostSchema)
