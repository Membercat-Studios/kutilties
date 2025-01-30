const { Schema, model } = require("mongoose");

const ProjectSchema = new Schema({
  totalProjects: { type: Number, default: 0 },
  projects: [
    {
      id: { type: String, required: true },
      lastUpdated: { type: Number, required: true },
    },
  ],
});

module.exports = model("membercat_projects", ProjectSchema);
