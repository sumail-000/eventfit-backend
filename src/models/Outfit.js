const mongoose = require('mongoose');

const outfitSchema = new mongoose.Schema(
  {
    outfitId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    event: { type: String, required: true, index: true },
    gender: { type: String, enum: ['women', 'men'], required: true, index: true },
    style: { type: String, required: true },
    formality: { type: String, enum: ['ultra-formal', 'formal', 'semi-formal', 'casual'], required: true },
    weatherSuitability: [{ type: String }],
    colors: [{ type: String }],
    colorNames: [{ type: String }],
    fabric: { type: String, required: true },
    occasion: { type: String },
    description: { type: String, required: true },
    tips: [{ type: String }],
    priceRange: { type: String },
    brands: [{ type: String }],
    image: { type: String, required: true },
    weatherTip: { type: String },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    trending: { type: Boolean, default: false },
    badge: { type: String },
    badgeType: { type: String, enum: ['gold', 'rose', 'violet', 'teal', 'muted'] },
  },
  { timestamps: true }
);

outfitSchema.index({ event: 1, gender: 1 });
outfitSchema.index({ trending: 1, rating: -1 });

module.exports = mongoose.model('Outfit', outfitSchema);
