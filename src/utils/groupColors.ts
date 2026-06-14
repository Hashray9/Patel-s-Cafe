export interface GroupColor {
  bg: string;      // background color
  border: string;  // border color
  text: string;    // text color
  badgeBg: string; // group badge bg
}

export const getGroupColor = (groupId?: string): GroupColor => {
  if (!groupId) {
    return {
      bg: 'bg-[#b2f0cf]', // available light green
      border: 'border-black',
      text: 'text-black',
      badgeBg: 'bg-black/10'
    };
  }

  const colors: GroupColor[] = [
    { bg: 'bg-[#d8e2ff]', border: 'border-[#002d6b]', text: 'text-[#002d6b]', badgeBg: 'bg-[#b6c7f4]' }, // Indigo
    { bg: 'bg-[#fdd2ff]', border: 'border-[#5f0067]', text: 'text-[#5f0067]', badgeBg: 'bg-[#f3aeff]' }, // Purple
    { bg: 'bg-[#ffe0b2]', border: 'border-[#623a00]', text: 'text-[#623a00]', badgeBg: 'bg-[#ffd090]' }, // Peach
    { bg: 'bg-[#efe5ff]', border: 'border-[#3f0099]', text: 'text-[#3f0099]', badgeBg: 'bg-[#d2b6ff]' }, // Lavender
    { bg: 'bg-[#e0f7fa]', border: 'border-[#006064]', text: 'text-[#006064]', badgeBg: 'bg-[#b2ebf2]' }, // Cyan
    { bg: 'bg-[#fff9c4]', border: 'border-[#f57f17]', text: 'text-[#f57f17]', badgeBg: 'bg-[#fff59d]' }, // Yellow
  ];

  let hash = 0;
  for (let i = 0; i < groupId.length; i++) {
    hash = groupId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};
