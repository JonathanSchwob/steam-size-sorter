const adjectives = [
  'Happy', 'Brave', 'Swift', 'Clever', 'Mighty', 'Noble', 'Wise', 'Bold', 'Epic', 'Pixel'
];

const nouns = [
  'Gamer', 'Knight', 'Wizard', 'Warrior', 'Hunter', 'Dragon', 'Hero', 'Legend', 'Master', 'Player'
];

export const generateUsername = () => {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 1000);
  return `${adjective}${noun}${number}`;
};
