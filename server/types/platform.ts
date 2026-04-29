export type Platform = {
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
};
