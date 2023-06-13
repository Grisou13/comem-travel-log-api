module.exports = {
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    default: null,
  },

  budget: {
    type: Number,
  },
  transportMethod: {
    transportType: {
      type: String,
      enum: ["van", "car", "plane"],
      default: "car",
    },
    pricePerUnit: Number,
    unit: {
      type: String,
      enum: ["km", "flight", "trip"],
      default: "km",
    },
  },
};
