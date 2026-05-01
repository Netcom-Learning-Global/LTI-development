// /storage/state.ts
const store = new Map();

export const setState = async (state: string, data: any) => {
  store.set(state, data);
};

export const getState = async (state: string) => {
  const data = store.get(state);
  return data
    ? {
        ...data,
        delete: async () => store.delete(state),
      }
    : null;
};