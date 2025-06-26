export const capitalizeFirstLetter = (str: string): string => {
  if (!str) return ''; 
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str.split(' ').map(word => capitalizeFirstLetter(word)).join(' ');
};