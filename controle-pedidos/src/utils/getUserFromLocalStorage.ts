export function getUserFromLocalStorage() {
  const data = localStorage.getItem('user');
  return data ? JSON.parse(data) : null;
}
