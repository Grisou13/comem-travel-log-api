const { compact, escapeRegExp, isArray, isFinite, pick } = require("lodash");
const mongoose = require("mongoose");
const uniqueValidatorPlugin = require("mongoose-unique-validator");

const config = require("../config");
const { includeRequested } = require("../utils/api");
const common = require("./common");

const {
  apiIdPlugin,
  hrefPlugin,
  parsePlugin,
  relatedHrefPluginFactory,
  timestampsPlugin,
} = require("../utils/models");

const Schema = mongoose.Schema;
const placeLogger = config.logger("place");
const def = {
  name: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 100,
    validate: {
      validator: validateNameAvailable,
      message: 'There is already a place named "{VALUE}" in this trip',
      type: "unique",
    },
  },
  order: {
    type: Number,
    default: 0,
  },
  description: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 50000,
  },
  location: {
    type: {
      type: String,
      required: true,
      enum: ["Point"],
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: validateCoordinates,
        message:
          "Coordinates must be an array of 2 to 3 numbers: longitude (between -180 and 180) and latitude (between -90 and 90) and an optional altitude",
        type: "coordinates",
      },
    },
  },
  pictureUrl: {
    type: String,
    minlength: 10,
    maxlength: 1000,
  },
  ...common,
  directions: {
    type: Object,
    distance: Number,
    previous: {
      type: Object,
    },
    next: {
      type: Object,
    },
  },

  type: {
    type: String,
    enum: ["PlaceOfInterest", "TripStop"],
    default: "TripStop",
  },
};
const placeSchema = new Schema(def);

placeSchema.index({ location: "2dsphere" });

placeSchema.plugin(apiIdPlugin);
placeSchema.plugin(hrefPlugin);
placeSchema.plugin(parsePlugin);
placeSchema.plugin(relatedHrefPluginFactory("Trip", { logger: placeLogger }));
placeSchema.plugin(timestampsPlugin);
placeSchema.plugin(uniqueValidatorPlugin);

placeSchema.methods.toJSON = function (options = {}) {
  const serialized = {
    id: this.apiId,
    ...pick(
      this,
      "href",
      ...Object.keys(def),
      "tripId",
      "tripHref",
      "createdAt",
      "updatedAt"
    ),
  };

  if (
    includeRequested(options.req, "trip", options.includeContext) ||
    includeRequested(options.req, "trip.user", options.includeContext)
  ) {
    serialized.trip = this.trip.toJSON({
      req: options.req,
      includeContext: compact([options.includeContext, "trip"]).join("."),
    });
  }

  return serialized;
};

placeSchema.statics.apiResource = "/api/places";
placeSchema.statics.editableProperties = [
  ...Object.keys(def),
  "tripId",
  "tripHref",
];

async function validateNameAvailable(value) {
  if (!value || !this.trip) {
    return true;
  }

  return this.constructor
    .findOne({
      _id: {
        $ne: this._id,
      },
      name: new RegExp(`^${escapeRegExp(value.toLowerCase())}$`, "i"),
      trip: this.trip,
    })
    .then((existingPlace) => !existingPlace);
}

function validateCoordinates(value) {
  return (
    isArray(value) &&
    value.length >= 2 &&
    value.length <= 3 &&
    value.every(isFinite) && // Ensure array of 2-3 numbers
    value[0] >= -180 &&
    value[0] <= 180 && // Ensure longitude valid
    value[1] >= -90 &&
    value[1] <= 90
  ); // Ensure latitude valid
}

module.exports = mongoose.model("Place", placeSchema);
