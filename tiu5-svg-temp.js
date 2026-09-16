const S = '#126bb5';
const svg = body => `<svg class="tiu-symbol" viewBox="0 0 100 80" aria-hidden="true"><g fill="none" stroke="${S}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const line = (x1,y1,x2,y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const rect = (x,y,w,h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
const circle = (cx,cy,r) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
const poly = points => `<polygon points="${points}"/>`;
const path = d => `<path d="${d}"/>`;
const filled = points => `<polygon points="${points}" fill="${S}"/>`;

const square = rect(27,17,46,46);
const triangle = poly('50,14 76,62 24,62');
const pentagon = poly('50,13 75,31 66,62 34,62 25,31');
const diamond = poly('50,13 75,40 50,67 25,40');

const questions = {
  21: {
    prompt: [svg(`${square}${line(28,18,72,62)}`), svg(`${line(29,18,71,62)}${line(71,18,29,62)}`), svg(`${poly('24,57 56,19 76,19 44,57')}${line(56,19,44,57)}`)],
    options: [
      svg(`${line(29,18,71,62)}${line(71,18,29,62)}`),
      svg(path('M30 61 H49 V41 H68 V20')),
      svg(`${line(26,59,74,21)}${line(52,13,52,66)}`),
      svg(poly('31,63 72,18 72,63')),
      svg(`${poly('22,58 55,18 78,18 45,58')}${line(55,18,45,58)}${line(32,58,68,18)}`)
    ]
  },
  22: {
    prompt: [svg(triangle), svg(`${filled('50,13 23,62 50,40')}${filled('50,13 77,62 50,40')}${filled('23,62 77,62 50,40')}<polygon points="50,40 63.5,62 36.5,62" fill="white" stroke="white"/>`), svg(square)],
    options: [
      svg(`${rect(25,18,50,19)}${rect(25,43,50,19)}`),
      svg(`${square}${filled('50,19 71,40 50,61 29,40')}`),
      svg(`${filled('25,16 75,16 75,64 25,64')}<polygon points="50,24 68,40 50,56 32,40" fill="white" stroke="white"/>`),
      svg(`${square}${line(28,18,72,62)}${line(72,18,28,62)}`),
      svg(`${filled('25,16 75,16 75,64 25,64')}<polygon points="50,21 57,33 70,40 57,47 50,60 43,47 30,40 43,33" fill="white" stroke="white"/>${line(25,40,75,40)}${line(50,16,50,64)}`)
    ]
  },
  23: {
    prompt: [svg(`${square}${circle(50,40,23)}`), svg(`${circle(50,40,27)}${rect(32,22,36,36)}`), svg(`${circle(50,40,28)}${poly('50,16 73,57 27,57')}`)],
    options: [
      svg(`${square}${circle(50,40,23)}`), svg(circle(50,40,27)),
      svg(`${square}${poly('50,18 71,40 50,62 29,40')}`), svg(`${poly('50,14 76,63 24,63')}${circle(50,46,16)}`),
      svg(`${circle(50,40,28)}${poly('25,27 75,27 50,67')}`)
    ]
  },
  24: {
    prompt: [svg(path('M31 22 V55 H64')), svg(path('M28 18 V45 H43 V58 H70 M43 29 H58 V45')), svg(rect(33,23,34,34))],
    options: [
      svg(`${rect(23,18,30,30)}${rect(33,28,30,30)}${rect(43,38,30,30)}`),
      svg(`${rect(25,15,34,34)}${rect(41,31,34,34)}`),
      svg(`${rect(41,15,34,34)}${rect(25,31,34,34)}`),
      svg(`${rect(27,18,38,38)}${rect(37,28,38,38)}`),
      svg(`${rect(29,10,42,20)}${rect(29,30,42,20)}${rect(29,50,42,20)}`)
    ]
  },
  25: {
    prompt: [svg(`${line(50,64,50,19)}${poly('43,27 50,17 57,27')}${line(39,64,61,64)}`), svg(`${line(50,20,50,60)}${poly('43,28 50,17 57,28')}${poly('43,52 50,63 57,52')}`), svg(`${line(50,24,50,59)}${line(42,24,58,24)}${rect(42,59,16,7)}`)],
    options: [
      svg(`${rect(42,15,16,7)}${line(50,22,50,57)}${line(42,57,58,57)}`),
      svg(`${line(50,61,50,23)}${poly('43,31 50,20 57,31')}${rect(43,59,14,7)}`),
      svg(`${line(50,20,50,60)}${poly('43,28 50,17 57,28')}${poly('43,52 50,63 57,52')}`),
      svg(`${rect(43,16,14,7)}${line(50,23,50,65)}`),
      svg(`${rect(43,15,14,7)}${line(50,22,50,59)}${poly('43,51 50,62 57,51')}`)
    ]
  },
  26: {
    prompt: [svg(triangle), svg(square), svg(pentagon)],
    options: [
      svg(poly('50,12 73,25 73,55 50,68 27,55 27,25')),
      svg(poly('25,17 75,17 65,49 50,66 35,49')),
      svg(`${poly('28,35 50,14 72,35')}${rect(28,35,44,31)}`),
      svg(`${rect(32,27,36,27)}${poly('32,27 50,10 68,27')}${poly('32,54 50,71 68,54')}`), svg(rect(31,21,38,38))
    ]
  },
  27: {
    prompt: [svg(`${rect(25,19,50,42)}${line(22,64,78,16)}${line(50,14,50,19)}${line(50,61,50,66)}`), svg(`${rect(20,25,60,31)}${line(18,57,82,23)}${line(20,40,80,40)}${line(16,40,20,40)}${line(80,40,84,40)}`), svg(`${circle(50,40,25)}${line(50,9,50,15)}${line(50,65,50,71)}`)],
    options: [
      svg(`${circle(50,40,25)}${line(50,10,50,70)}`),
      svg(`${circle(50,40,25)}${line(25,40,75,40)}`),
      svg(`${circle(50,40,25)}${line(19,40,81,40)}${line(50,9,50,15)}${line(50,65,50,71)}`),
      svg(`${circle(50,40,25)}${line(50,10,50,70)}${line(20,40,80,40)}`),
      svg(`${circle(50,40,25)}${line(50,10,50,70)}${line(19,40,25,40)}${line(75,40,81,40)}`)
    ]
  },
  28: {
    prompt: [svg(`${rect(35,25,30,27)}${line(50,17,50,25)}`), svg(`${rect(20,21,30,25)}${rect(50,21,30,25)}${rect(35,46,30,25)}${line(35,13,35,21)}${line(50,71,50,76)}`), svg(triangle)],
    options: [
      svg(`${poly('50,10 73,48 27,48')}${poly('27,48 50,72 4,72')}${poly('73,48 96,72 50,72')}`),
      svg(`${poly('27,16 48,49 6,49')}${poly('73,16 94,49 52,49')}${poly('29,55 71,55 50,76')}${line(48,49,52,49)}${line(27,11,27,16)}${line(6,49,2,54)}${line(94,49,98,54)}${line(50,76,50,79)}`),
      svg(`${poly('27,14 48,48 6,48')}${poly('73,14 94,48 52,48')}${poly('50,47 72,76 28,76')}`),
      svg(`${poly('27,18 48,57 6,57')}${poly('73,18 94,57 52,57')}${line(48,57,52,57)}${line(6,57,22,70)}${line(94,57,78,70)}${line(22,70,78,70)}`),
      svg(`${poly('27,16 48,49 6,49')}${poly('73,16 94,49 52,49')}${poly('29,55 71,55 50,76')}${line(48,49,52,49)}`)
    ]
  },
  29: {
    prompt: [svg(circle(50,40,27)), svg(path('M30 16 C57 16 57 64 30 64 M70 16 C43 16 43 64 70 64')), svg(triangle)],
    options: [
      svg(`${line(27,18,73,62)}${line(73,18,27,62)}`),
      svg(path('M65 17 H38 L61 40 L36 63 H65')),
      svg(path('M18 52 H35 L50 31 L65 52 H82')),
      svg(path('M17 54 H32 L44 34 L56 54 L68 34 L83 54')),
      svg(path('M18 29 L50 40 L18 51 Z M82 29 L50 40 L82 51 Z'))
    ]
  },
  30: {
    prompt: [svg(line(50,15,50,65)), svg(`${line(38,25,59,46)}${line(59,46,59,37)}`), svg(`${line(39,27,59,47)}${line(39,27,39,20)}`)],
    options: [
      svg(`${line(34,20,66,55)}${line(66,55,66,45)}`),
      svg(path('M35 26 V58 H68')),
      svg(path('M34 24 L57 47 L68 36')),
      svg(`${line(34,56,66,21)}${line(34,56,34,46)}`),
      svg(path('M31 22 V61 H70'))
    ]
  }
};

export function renderTiuSvgQuestion(number) {
  return questions[number] || null;
}
