import mongoose from 'mongoose'

const NotificationSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'Signup', required: true },
  type:         { type: String, enum: ['follow', 'message', 'mention', 'collab_invite', 'collab_request', 'comment', 'project_post', 'like', 'system'], required: true },
  from:         { type: mongoose.Schema.Types.ObjectId, ref: 'Signup' },
  project:      { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  collabRequest:{ type: mongoose.Schema.Types.ObjectId, ref: 'CollabRequest' },
  bulletinPost: { type: mongoose.Schema.Types.ObjectId, ref: 'BulletinPost' },
  role:      { type: String },
  status:    { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  text:      { type: String },
  body:      { type: String },
  link:      { type: String },
  read:      { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
})

if (mongoose.models['Notification']) mongoose.deleteModel('Notification')
export default mongoose.model('Notification', NotificationSchema)
