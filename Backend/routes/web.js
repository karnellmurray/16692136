const express    = require('express')
const router     = express.Router()
const controller = require('../controllers/membersController')

router.get('/members',            controller.getMembers)
router.get('/members/spotlight',  controller.getSpotlightMember)
router.get('/members/featured',   controller.getFeaturedMembers)
router.get('/members/:username',  controller.getMemberByUsername)
router.get('/disciplines',      controller.getDisciplines)
router.get('/stats',            controller.getStats)
router.post('/signups',         controller.submitSignup)

module.exports = router