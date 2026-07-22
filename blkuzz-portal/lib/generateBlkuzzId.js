import Signup from '@/models/Signup'

export async function generateBlkuzzId() {
  let attempts = 0
  while (attempts < 5) {
    try {
      const last = await Signup.findOne(
        { blkuzzId: { $exists: true, $ne: null } },
        { blkuzzId: 1 },
        { sort: { blkuzzId: -1 } }
      )
      let nextNumber = 1
      if (last?.blkuzzId) {
        nextNumber = parseInt(last.blkuzzId.replace('BLK-', ''), 10) + 1
      }
      const padded = String(nextNumber).padStart(4, '0')
      return `BLK-${padded}`
    } catch (err) {
      attempts++
      if (attempts >= 5) throw err
    }
  }
}
