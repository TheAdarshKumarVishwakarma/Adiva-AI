import mongoose from 'mongoose';

const guestUsageSchema = new mongoose.Schema({
  guestId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  chatCount: {
    type: Number,
    default: 0
  },
  lastSeenAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, { timestamps: true });

guestUsageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

guestUsageSchema.statics.getOrCreate = async function(guestId) {
  const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const existing = await this.findOne({ guestId });
  if (existing) {
    existing.lastSeenAt = new Date();
    if (existing.expiresAt < expiry) {
      existing.expiresAt = expiry;
    }
    await existing.save();
    return existing;
  }
  return this.create({ guestId, expiresAt: expiry });
};

const GuestUsage = mongoose.model('GuestUsage', guestUsageSchema);

export default GuestUsage;
