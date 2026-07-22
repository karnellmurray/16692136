import mongoose from 'mongoose'

const { Schema } = mongoose
const ObjectId   = Schema.Types.ObjectId

const ProjectCommentSchema = new Schema({
  post:    { type: ObjectId, ref: 'ProjectPost', required: true },
  author:  { type: ObjectId, ref: 'Signup',      required: true },
  content: { type: String, required: true },
  likes:   [{ type: ObjectId, ref: 'Signup' }],
  createdAt: { type: Date, default: Date.now },
})

if (mongoose.models['ProjectComment']) mongoose.deleteModel('ProjectComment')
export default mongoose.model('ProjectComment', ProjectCommentSchema)
