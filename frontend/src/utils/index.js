export const DEFAULT_IMAGE_URL = 'https://images.unsplash.com/photo-1557682257-2f9c37a3a5f3?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MzR8fGdyYWRpZW50fGVufDB8fDB8fA%3D%3D&auto=format&fit=crop&w=500&q=60';

// <img onError> handler: swaps a broken image (dead host, 404, etc.) for the default image.
// The src check stops an infinite loop if the default image itself fails to load.
export const fallbackToDefaultImage = e => {
  if (e.currentTarget.src !== DEFAULT_IMAGE_URL) e.currentTarget.src = DEFAULT_IMAGE_URL;
}

export const getTimeElapsed = createdAt => {
  const ms = Date.now() - Date.parse(createdAt);
  
  const secondsAgo = Math.floor(ms / 1000);
  const minutesAgo = Math.floor(secondsAgo / 60)
  const hoursAgo = Math.floor(minutesAgo / 60);
  const daysAgo = Math.floor(hoursAgo / 24);
  const monthsAgo = Math.floor(daysAgo / 30);
  const yearsAgo = Math.floor(daysAgo / 365);

  if (secondsAgo === 1) return '1 second ago';
  else if (minutesAgo < 1) return secondsAgo + ' seconds ago';
  
  if (minutesAgo === 1) return '1 minute ago';
  else if (hoursAgo < 1) return minutesAgo + ' minutes ago';
  
  if (hoursAgo === 1) return '1 hour ago';
  else if (daysAgo < 1) return hoursAgo + ' hours ago';
  
  if (daysAgo === 1) return '1 day ago';
  else if (monthsAgo < 1) return daysAgo + ' days ago'
  
  if (monthsAgo === 1) return '1 month ago';
  else if (yearsAgo < 1) return monthsAgo + ' months ago';
  
  if (yearsAgo === 1) return '1 year ago';
  else return yearsAgo + ' years ago';
}
