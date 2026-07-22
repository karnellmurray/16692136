export const BP = '/portal'
export const apiFetch = (path, init) => fetch(`${BP}${path}`, init)
