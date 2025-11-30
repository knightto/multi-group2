// Centralized event management module for multi-group2
// All event CRUD, signup, maybe-list, and business logic is handled here

const Event = require('../models/Event');
const Group = require('../models/Group');

module.exports = {
  // Get all events for a group
  async getEventsForGroup(groupId, { activeOnly = true } = {}) {
    const group = await Group.findById(groupId);
    if (!group || group.isArchived) throw new Error('Group not found');
    const query = { groupId };
    if (activeOnly) query.isActive = true;
    return Event.find(query).sort('date');
  },

  // Create a new event for a group
  async createEvent(groupId, data, adminCode, checkAdminCode) {
    if (!checkAdminCode(adminCode)) throw new Error('Invalid admin code');
    const group = await Group.findById(groupId);
    if (!group || group.isArchived) throw new Error('Group not found');
    if (!data.name || !data.date || !data.type) throw new Error('name, date and type are required');
    if (!['teeTime', 'team'].includes(data.type)) throw new Error('Invalid event type');
    const event = new Event({
      groupId,
      name: data.name,
      date: new Date(data.date),
      type: data.type,
      description: data.description,
      maxPlayers: data.maxPlayers ? Number(data.maxPlayers) : undefined,
      teamSize: data.teamSize ? Number(data.teamSize) : undefined,
      startType: data.startType,
      isActive: true,
      teeTimes: Array.isArray(data.teeTimes) ? data.teeTimes : [],
      teams: Array.isArray(data.teams) ? data.teams : []
    });
    await event.save();
    return event;
  },

  // Edit event (admin)
  async editEvent(eventId, data, adminCode, checkAdminCode) {
    if (!checkAdminCode(adminCode)) throw new Error('Invalid admin code');
    const event = await Event.findById(eventId);
    if (!event) throw new Error('Event not found');
    [
      'name','date','type','description','maxPlayers','teamSize','startType','isActive','teeTimes','teams'
    ].forEach(key => {
      if (data[key] !== undefined) event[key] = data[key];
    });
    await event.save();
    return event;
  },

  // Add/remove maybe-list
  async addMaybe(eventId, name) {
    if (!name || typeof name !== 'string' || !name.trim()) throw new Error('Name is required');
    const event = await Event.findById(eventId);
    if (!event) throw new Error('Event not found');
    if (!event.maybeList) event.maybeList = [];
    if (event.maybeList.includes(name.trim())) throw new Error('Already on maybe list');
    event.maybeList.push(name.trim());
    await event.save();
    return event.maybeList;
  },
  async removeMaybe(eventId, idx) {
    const event = await Event.findById(eventId);
    if (!event) throw new Error('Event not found');
    if (!event.maybeList || idx < 0 || idx >= event.maybeList.length) throw new Error('Invalid maybe list index');
    event.maybeList.splice(idx, 1);
    await event.save();
    return event.maybeList;
  },

  // Additional methods for signup, removal, etc. can be added here
};
// Event logic removed
