import mongoose from "mongoose";

const { models, model, Schema } = mongoose;
export interface IPlatformData {
  url: string;
  name: string;
  clientId: string;
  authenticationEndpoint: string;
  accessTokenEndpoint: string;
  authConfig: {
    method: string;
    key: string;
  };
  kid: string;
  privateKey: string;
  publicKey: string;
}

export interface IPlatform {
  iss: string;
  clientId: string;
  toolName?: string;
  description?: string;
  clientEmail?: string;
  moodleUrl?: string;
  orgId?: number;
  apiKey?: string;
  secretKey?: string;
  data: IPlatformData;
  orgName?: string;
}

const platformSchema = new Schema<IPlatform>(
  {
    iss: { type: String},
    clientId: { type: String },
    toolName: String,
    description: String,
    clientEmail: String,
    moodleUrl: String,
    orgId: {
      type: Number,
    },
    apiKey: {
      type: String,
    },
    secretKey: {
      type: String,
    },
    data: {
      url: String,
      name: String,
      clientId: String,
      authenticationEndpoint: String,
      accessTokenEndpoint: String,
      authConfig: {
        method: String,
        key: String,
      },
      kid: String,
      privateKey: String,
      publicKey: String,
    },
    orgName: {
      type: String,
    },
  },
  { timestamps: true }
);
platformSchema.index({ iss: 1, clientId: 1 }, { unique: true });
const Platform =
  (models.Platform as mongoose.Model<IPlatform>) ||
  model<IPlatform>("Platform", platformSchema);
export default Platform;