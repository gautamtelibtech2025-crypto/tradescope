let tokenState = {
  accessToken: "",
  refreshToken: "",
  appId: "",
  updatedAt: null,
  raw: null,
};

export function saveFyersToken({ accessToken, refreshToken = "", appId, raw }) {
  tokenState = {
    accessToken,
    refreshToken,
    appId,
    updatedAt: new Date().toISOString(),
    raw,
  };
}

export function getFyersTokenState() {
  return tokenState;
}

export function hasFyersAccessToken() {
  return Boolean(tokenState.accessToken || process.env.FYERS_ACCESS_TOKEN);
}

export function getFyersAccessToken() {
  return tokenState.accessToken || process.env.FYERS_ACCESS_TOKEN || "";
}
