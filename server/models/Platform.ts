import mongoose from "mongoose";

const { models, model, Schema } = mongoose;

// ✅ Strong typing for platform.data
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

  // 🔥 REQUIRED FOR LTI
  privateKey: string;
  publicKey: string;
}

export interface IPlatform {
  iss: string;
  clientId: string;
  data: IPlatformData;
}

const platformSchema = new Schema<IPlatform>(
  {
    iss: { type: String, required: true },
    clientId: { type: String, required: true },

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

      // 🔥 ADD THESE (MOST IMPORTANT)
      privateKey: String,
      publicKey: String,
    },
  },
  { timestamps: true }
);

// 🔥 prevent duplicates
platformSchema.index({ iss: 1, clientId: 1 }, { unique: true });

const Platform =
  (models.Platform as mongoose.Model<IPlatform>) ||
  model<IPlatform>("Platform", platformSchema);

export default Platform;