const { compact, pick } = require("lodash");
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
  transientPropertyPluginFactory,
} = require("../utils/models");

const Schema = mongoose.Schema;
const tripLogger = config.logger("trip");

const tripSchema = new Schema({
  title: {
    type: String,
    required: true,
    unique: true,
    uniqueValidator: true,
    minlength: 3,
    maxlength: 100,
  },
  description: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 50000,
  },
  totalDistance: {
    type: Number,
    default: 0,
  },
  ...common,
});

tripSchema.plugin(apiIdPlugin);
tripSchema.plugin(hrefPlugin);
tripSchema.plugin(parsePlugin);
tripSchema.plugin(relatedHrefPluginFactory("User", { logger: tripLogger }));
tripSchema.plugin(timestampsPlugin);
tripSchema.plugin(transientPropertyPluginFactory("placesCount"));
tripSchema.plugin(uniqueValidatorPlugin);

tripSchema.methods.toJSON = function (options = {}) {
  const serialized = {
    id: this.apiId,
    ...pick(
      this,
      "href",
      "title",
      "description",
      "placesCount",
      "budget",
      "startDate",
      "endDate",
      "transportMethod",
      "totalDistance",
      "userId",
      "userHref",
      "createdAt",
      "updatedAt"
    ),
  };

  if (includeRequested(options.req, "user", options.includeContext)) {
    serialized.user = this.user.toJSON({
      req: options.req,
      includeContext: compact([options.includeContext, "user"]).join("."),
    });
  }

  return serialized;
};

tripSchema.statics.apiResource = "/api/trips";
tripSchema.statics.editableProperties = [
  "title",
  "description",
  "budget",
  "startDate",
  "endDate",
  "transportMethod",
  "totalDistance",
];

// Cascade delete
tripSchema.pre("remove", async function () {
  const Place = mongoose.model("Place");
  tripLogger.debug(`Deleting all places related to trip ${this.apiId}`);
  await Place.remove({ trip: this.id });
});

module.exports = mongoose.model("Trip", tripSchema);
