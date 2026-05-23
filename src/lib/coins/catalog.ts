export type CoinSeries = {
  slug: string
  name: string
  dateRange: string
  denomination?: string
  image?: string | null
  imageReverse?: string | null   // reverse (eagle) side
  dualSide?: boolean             // true if image already contains both sides
  coinNames: string[]
  notes?: string
  individual?: boolean
}

export type CoinCategory = {
  slug: string
  name: string
  series: CoinSeries[]
}

export const COIN_CATALOG: CoinCategory[] = [
  // ─────────────────────────────────────────────
  // HALF CENTS
  // ─────────────────────────────────────────────
  {
    slug: 'half-cents',
    name: 'Half Cents',
    series: [
      {
        slug: 'liberty-cap-half-cent',
        name: 'Liberty Cap Half Cent',
        dateRange: '1793–1797',
        denomination: '½¢',
        image: '/coins/liberty-cap-half-cent-type-1.jpg',
        imageReverse: '/coins/liberty-cap-half-cent-type-1-reverse.jpg',
        coinNames: ['Liberty Cap Half Cent'],
      },
      {
        slug: 'draped-bust-half-cent',
        name: 'Draped Bust Half Cent',
        dateRange: '1800–1808',
        denomination: '½¢',
        image: '/coins/draped-bust-half-cent.jpg',
        imageReverse: '/coins/draped-bust-half-cent-reverse.jpg',
        coinNames: ['Draped Bust Half Cent'],
      },
      {
        slug: 'classic-head-half-cent',
        name: 'Classic Head Half Cent',
        dateRange: '1809–1836',
        denomination: '½¢',
        image: '/coins/classic-head-half-cent.jpg',
        imageReverse: '/coins/classic-head-half-cent-reverse.jpg',
        coinNames: ['Classic Head Half Cent'],
      },
      {
        slug: 'braided-hair-half-cent',
        name: 'Braided Hair Half Cent',
        dateRange: '1840–1857',
        denomination: '½¢',
        image: '/coins/braided-hair-half-cent.jpg',
        imageReverse: '/coins/braided-hair-half-cent-reverse.jpg',
        coinNames: ['Braided Hair Half Cent'],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // LARGE CENTS
  // ─────────────────────────────────────────────
  {
    slug: 'large-cents',
    name: 'Large Cents',
    series: [
      {
        slug: 'flowing-hair-cent',
        name: 'Flowing Hair Cent',
        dateRange: '1793',
        denomination: '1¢',
        image: '/coins/flowing-hair-chain-cent.jpg',
        imageReverse: '/coins/flowing-hair-chain-cent-reverse.jpg',
        coinNames: ['Flowing Hair Chain Cent', 'Chain Cent', 'Flowing Hair Wreath Cent', 'Wreath Cent'],
      },
      {
        slug: 'liberty-cap-cent',
        name: 'Liberty Cap Cent',
        dateRange: '1793–1796',
        denomination: '1¢',
        image: '/coins/flowing-hair-wreath-cent.jpg',
        imageReverse: '/coins/flowing-hair-wreath-cent-reverse.jpg',
        coinNames: ['Liberty Cap Cent', 'Flowing Hair Wreath Cent', 'Wreath Cent'],
      },
      {
        slug: 'draped-bust-cent',
        name: 'Draped Bust Cent',
        dateRange: '1796–1807',
        denomination: '1¢',
        image: '/coins/draped-bust-cent.jpg',
        imageReverse: '/coins/draped-bust-cent-reverse.jpg',
        coinNames: ['Draped Bust Cent'],
      },
      {
        slug: 'classic-head-cent',
        name: 'Classic Head Cent',
        dateRange: '1808–1814',
        denomination: '1¢',
        image: '/coins/classic-head-cent.jpg',
        imageReverse: '/coins/classic-head-cent-reverse.jpg',
        coinNames: ['Classic Head Cent'],
      },
      {
        slug: 'coronet-matron-head-cent',
        name: 'Coronet Head Cent',
        dateRange: '1816–1839',
        denomination: '1¢',
        image: '/coins/coronet-matron-head-cent.jpg',
        imageReverse: '/coins/coronet-matron-head-cent-reverse.jpg',
        coinNames: ['Coronet Head Cent', 'Matron Head Cent'],
      },
      {
        slug: 'braided-hair-cent',
        name: 'Braided Hair Cent',
        dateRange: '1839–1857',
        denomination: '1¢',
        image: '/coins/braided-hair-cent.jpg',
        imageReverse: '/coins/braided-hair-cent-reverse.jpg',
        coinNames: ['Braided Hair Cent'],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // SMALL CENTS
  // ─────────────────────────────────────────────
  {
    slug: 'small-cents',
    name: 'Small Cents',
    series: [
      {
        slug: 'flying-eagle-cent',
        name: 'Flying Eagle Cent',
        dateRange: '1856–1858',
        denomination: '1¢',
        image: '/coins/flying-eagle-cent.jpg',
        imageReverse: '/coins/flying-eagle-cent-reverse.jpg',
        coinNames: ['Flying Eagle Cent'],
      },
      {
        slug: 'indian-head-cent',
        name: 'Indian Head Cent',
        dateRange: '1859–1909',
        denomination: '1¢',
        image: '/coins/indian-head-cent.jpg',
        imageReverse: '/coins/indian-head-cent-reverse.jpg',
        coinNames: ['Indian Head Cent', 'Indian Head Penny'],
      },
      {
        slug: 'lincoln-wheat-cent',
        name: 'Lincoln Wheat Cent',
        dateRange: '1909–1958',
        denomination: '1¢',
        image: '/coins/lincoln-wheat-cent.jpg',
        imageReverse: '/coins/lincoln-wheat-cent-reverse.jpg',
        coinNames: ['Lincoln Cent', 'Lincoln Wheat Cent', 'Wheat Penny', 'Lincoln Wheat Penny'],
      },
      {
        slug: 'lincoln-memorial-cent',
        name: 'Lincoln Memorial Cent',
        dateRange: '1959–2008',
        denomination: '1¢',
        image: '/coins/lincoln-memorial-cent.jpg',
        imageReverse: '/coins/lincoln-memorial-cent-reverse.jpg',
        coinNames: ['Lincoln Memorial Cent', 'Lincoln Cent'],
      },
      {
        slug: 'lincoln-bicentennial-cent',
        name: 'Lincoln Bicentennial Cent',
        dateRange: '2009',
        denomination: '1¢',
        image: '/coins/lincoln-bicentennial-cent.jpg',
        imageReverse: '/coins/lincoln-bicentennial-cent-reverse.jpg',
        coinNames: ['Lincoln Bicentennial Cent'],
      },
      {
        slug: 'lincoln-shield-cent',
        name: 'Lincoln Shield Cent',
        dateRange: '2010–present',
        denomination: '1¢',
        image: '/coins/lincoln-shield-cent.jpg',
        imageReverse: '/coins/lincoln-shield-cent-reverse.jpg',
        coinNames: ['Lincoln Shield Cent', 'Lincoln Cent'],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // TWO-CENT PIECES
  // ─────────────────────────────────────────────
  {
    slug: 'two-cent-pieces',
    name: 'Two-Cent Pieces',
    series: [
      {
        slug: 'two-cent-piece',
        name: 'Two-Cent Piece',
        dateRange: '1864–1873',
        denomination: '2¢',
        image: '/coins/two-cent-piece.jpg',
        imageReverse: '/coins/two-cent-piece-reverse.jpg',
        coinNames: ['Two-Cent Piece', 'Two Cent Piece'],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // THREE-CENT PIECES
  // ─────────────────────────────────────────────
  {
    slug: 'three-cent-pieces',
    name: 'Three-Cent Pieces',
    series: [
      {
        slug: 'three-cent-silver',
        name: 'Three-Cent Silver (Trime)',
        dateRange: '1851–1873',
        denomination: '3¢',
        image: '/coins/three-cent-silver.jpg',
        imageReverse: '/coins/three-cent-silver-reverse.jpg',
        coinNames: ['Three-Cent Silver', 'Trime', 'Three Cent Silver'],
      },
      {
        slug: 'three-cent-nickel',
        name: 'Three-Cent Nickel',
        dateRange: '1865–1889',
        denomination: '3¢',
        image: '/coins/three-cent-nickel.jpg',
        imageReverse: '/coins/three-cent-nickel-reverse.jpg',
        coinNames: ['Three-Cent Nickel', 'Three Cent Nickel'],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // HALF DIMES
  // ─────────────────────────────────────────────
  {
    slug: 'half-dimes',
    name: 'Half Dimes',
    series: [
      {
        slug: 'bust-half-disme',
        name: 'Bust Half Disme',
        dateRange: '1792',
        denomination: '5¢',
        image: '/coins/bust-half-disme.jpg',
        imageReverse: '/coins/bust-half-disme-reverse.jpg',
        coinNames: ['Bust Half Disme', 'Half Disme'],
      },
      {
        slug: 'flowing-hair-half-dime',
        name: 'Flowing Hair Half Dime',
        dateRange: '1794–1795',
        denomination: '5¢',
        image: '/coins/flowing-hair-half-dime.jpg',
        imageReverse: '/coins/flowing-hair-half-dime-reverse.jpg',
        coinNames: ['Flowing Hair Half Dime'],
      },
      {
        slug: 'draped-bust-half-dime',
        name: 'Draped Bust Half Dime',
        dateRange: '1796–1805',
        denomination: '5¢',
        image: '/coins/draped-bust-half-dime.jpg',
        imageReverse: '/coins/draped-bust-half-dime-reverse.jpg',
        coinNames: ['Draped Bust Half Dime'],
      },
      {
        slug: 'capped-bust-half-dime',
        name: 'Capped Bust Half Dime',
        dateRange: '1829–1837',
        denomination: '5¢',
        image: '/coins/capped-bust-half-dime.jpg',
        imageReverse: '/coins/capped-bust-half-dime-reverse.jpg',
        coinNames: ['Capped Bust Half Dime'],
      },
      {
        slug: 'liberty-seated-half-dime',
        name: 'Liberty Seated Half Dime',
        dateRange: '1837–1873',
        denomination: '5¢',
        image: '/coins/liberty-seated-half-dime.jpg',
        imageReverse: '/coins/liberty-seated-half-dime-reverse.jpg',
        coinNames: ['Liberty Seated Half Dime'],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // NICKELS
  // ─────────────────────────────────────────────
  {
    slug: 'nickels',
    name: 'Nickels',
    series: [
      {
        slug: 'shield-nickel',
        name: 'Shield Nickel',
        dateRange: '1866–1883',
        denomination: '5¢',
        image: '/coins/shield-nickel.jpg',
        imageReverse: '/coins/shield-nickel-reverse.jpg',
        coinNames: ['Shield Nickel'],
      },
      {
        slug: 'liberty-head-nickel',
        name: 'Liberty Head Nickel',
        dateRange: '1883–1912',
        denomination: '5¢',
        image: '/coins/liberty-head-nickel.jpg',
        imageReverse: '/coins/liberty-head-nickel-reverse.jpg',
        coinNames: ['Liberty Head Nickel', 'V Nickel'],
      },
      {
        slug: 'buffalo-nickel',
        name: 'Buffalo Nickel',
        dateRange: '1913–1938',
        denomination: '5¢',
        image: '/coins/buffalo-nickel.jpg',
        imageReverse: '/coins/buffalo-nickel-reverse.jpg',
        coinNames: ['Buffalo Nickel', 'Indian Head Nickel'],
      },
      {
        slug: 'jefferson-nickel',
        name: 'Jefferson Nickel',
        dateRange: '1938–2003',
        denomination: '5¢',
        image: '/coins/jefferson-nickel.jpg',
        imageReverse: '/coins/jefferson-nickel-reverse.jpg',
        coinNames: ['Jefferson Nickel', 'Jefferson Wartime Nickel', 'Silver War Nickel', 'Wartime Nickel'],
      },
      {
        slug: 'westward-journey-nickel',
        name: 'Westward Journey Nickel',
        dateRange: '2004–2005',
        denomination: '5¢',
        image: '/coins/westward-journey-nickel.jpg',
        imageReverse: '/coins/westward-journey-nickel-reverse.jpg',
        coinNames: ['Westward Journey Nickel'],
      },
      {
        slug: 'jefferson-nickel-return',
        name: 'Jefferson Nickel (Return to Monticello)',
        dateRange: '2006–present',
        denomination: '5¢',
        image: '/coins/jefferson-nickel-return.jpg',
        imageReverse: '/coins/jefferson-nickel-return-reverse.jpg',
        coinNames: ['Jefferson Nickel'],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // DIMES
  // ─────────────────────────────────────────────
  {
    slug: 'dimes',
    name: 'Dimes',
    series: [
      {
        slug: 'draped-bust-dime',
        name: 'Draped Bust Dime',
        dateRange: '1796–1807',
        denomination: '10¢',
        image: '/coins/draped-bust-dime.jpg',
        imageReverse: '/coins/draped-bust-dime-reverse.jpg',
        coinNames: ['Draped Bust Dime'],
      },
      {
        slug: 'capped-bust-dime',
        name: 'Capped Bust Dime',
        dateRange: '1809–1837',
        denomination: '10¢',
        image: '/coins/capped-bust-dime.jpg',
        imageReverse: '/coins/capped-bust-dime-reverse.jpg',
        coinNames: ['Capped Bust Dime'],
      },
      {
        slug: 'liberty-seated-dime',
        name: 'Liberty Seated Dime',
        dateRange: '1837–1891',
        denomination: '10¢',
        image: '/coins/liberty-seated-dime.jpg',
        imageReverse: '/coins/liberty-seated-dime-reverse.jpg',
        coinNames: ['Liberty Seated Dime'],
      },
      {
        slug: 'barber-dime',
        name: 'Barber Dime',
        dateRange: '1892–1916',
        denomination: '10¢',
        image: '/coins/barber-dime.jpg',
        imageReverse: '/coins/barber-dime-reverse.jpg',
        coinNames: ['Barber Dime'],
      },
      {
        slug: 'mercury-dime',
        name: 'Mercury Dime',
        dateRange: '1916–1945',
        denomination: '10¢',
        image: '/coins/mercury-dime.jpg',
        imageReverse: '/coins/mercury-dime-reverse.jpg',
        coinNames: ['Mercury Dime', 'Winged Liberty Head Dime'],
      },
      {
        slug: 'roosevelt-dime',
        name: 'Roosevelt Dime',
        dateRange: '1946–present',
        denomination: '10¢',
        image: '/coins/roosevelt-dime-clad.jpg',
        imageReverse: '/coins/roosevelt-dime-clad-reverse.jpg',
        coinNames: ['Roosevelt Dime', 'Silver Roosevelt Dime', 'Clad Roosevelt Dime'],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // TWENTY-CENT PIECES
  // ─────────────────────────────────────────────
  {
    slug: 'twenty-cent-pieces',
    name: 'Twenty-Cent Pieces',
    series: [
      {
        slug: 'twenty-cent-piece',
        name: 'Twenty-Cent Piece',
        dateRange: '1875–1878',
        denomination: '20¢',
        image: '/coins/twenty-cent-piece.jpg',
        imageReverse: '/coins/twenty-cent-piece-reverse.jpg',
        coinNames: ['Twenty-Cent Piece', 'Twenty Cent Piece'],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // QUARTERS
  // ─────────────────────────────────────────────
  {
    slug: 'quarters',
    name: 'Quarters',
    series: [
      {
        slug: 'draped-bust-quarter',
        name: 'Draped Bust Quarter',
        dateRange: '1796–1807',
        denomination: '25¢',
        image: '/coins/draped-bust-quarter.jpg',
        imageReverse: '/coins/draped-bust-quarter-reverse.jpg',
        coinNames: ['Draped Bust Quarter'],
      },
      {
        slug: 'capped-bust-quarter',
        name: 'Capped Bust Quarter',
        dateRange: '1815–1838',
        denomination: '25¢',
        image: '/coins/capped-bust-quarter.jpg',
        imageReverse: '/coins/capped-bust-quarter-reverse.jpg',
        coinNames: ['Capped Bust Quarter'],
      },
      {
        slug: 'liberty-seated-quarter',
        name: 'Liberty Seated Quarter',
        dateRange: '1838–1891',
        denomination: '25¢',
        image: '/coins/liberty-seated-quarter-with-motto.jpg',
        imageReverse: '/coins/liberty-seated-quarter-with-motto-reverse.jpg',
        coinNames: ['Liberty Seated Quarter', 'Liberty Seated Quarter No Motto', 'Liberty Seated Quarter With Motto'],
      },
      {
        slug: 'barber-quarter',
        name: 'Barber Quarter',
        dateRange: '1892–1916',
        denomination: '25¢',
        image: 'https://upload.wikimedia.org/wikipedia/commons/d/df/1914_Barber_Quarter_NGC_AU58_Obverse.png',
        imageReverse: 'https://upload.wikimedia.org/wikipedia/commons/c/cd/1914_Barber_Quarter_NGC_AU58_Reverse.png',
        coinNames: ['Barber Quarter'],
      },
      {
        slug: 'standing-liberty-quarter',
        name: 'Standing Liberty Quarter',
        dateRange: '1916–1930',
        denomination: '25¢',
        image: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Standing_Liberty_Quarter_Type2_1924D_Obverse.png',
        imageReverse: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Standing_Liberty_Quarter_Type2_1924D_Reverse.png',
        coinNames: ['Standing Liberty Quarter', 'Standing Liberty Quarter Type 1', 'Standing Liberty Quarter Type 2'],
      },
      {
        slug: 'washington-quarter',
        name: 'Washington Quarter',
        dateRange: '1932–1998',
        denomination: '25¢',
        image: 'https://upload.wikimedia.org/wikipedia/commons/b/bb/1994-P_Washington_quarter_obverse.jpg',
        imageReverse: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Washington_Quarter_Silver_1944S_Reverse.png',
        coinNames: ['Washington Quarter', 'Silver Washington Quarter', 'Clad Washington Quarter'],
      },
      {
        slug: '50-state-quarters',
        name: '50 State Quarters',
        dateRange: '1999–2008',
        denomination: '25¢',
        image: '/coins/50-state-quarters.jpg',
        imageReverse: '/coins/50-state-quarters-reverse.jpg',
        coinNames: ['50 State Quarter', 'State Quarter'],
      },
      {
        slug: 'dc-us-territories-quarters',
        name: 'D.C. & U.S. Territories Quarters',
        dateRange: '2009',
        denomination: '25¢',
        image: '/coins/dc-us-territories-quarters.jpg',
        imageReverse: '/coins/dc-us-territories-quarters-reverse.jpg',
        coinNames: ['DC Territories Quarter', 'D.C. and U.S. Territories Quarter'],
      },
      {
        slug: 'america-the-beautiful-quarters',
        name: 'America the Beautiful Quarters',
        dateRange: '2010–2021',
        denomination: '25¢',
        image: '/coins/america-the-beautiful-quarters.jpg',
        imageReverse: '/coins/america-the-beautiful-quarters-reverse.jpg',
        coinNames: ['America the Beautiful Quarter', 'ATB Quarter'],
      },
      {
        slug: 'american-women-quarters',
        name: 'American Women Quarters',
        dateRange: '2022–2025',
        denomination: '25¢',
        image: '/coins/american-women-quarters.jpg',
        imageReverse: '/coins/american-women-quarters-reverse.jpg',
        coinNames: ['American Women Quarter'],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // HALF DOLLARS
  // ─────────────────────────────────────────────
  {
    slug: 'half-dollars',
    name: 'Half Dollars',
    series: [
      {
        slug: 'flowing-hair-half-dollar',
        name: 'Flowing Hair Half Dollar',
        dateRange: '1794–1795',
        denomination: '50¢',
        image: '/coins/flowing-hair-half-dollar.jpg',
        imageReverse: '/coins/flowing-hair-half-dollar-reverse.jpg',
        coinNames: ['Flowing Hair Half Dollar'],
      },
      {
        slug: 'draped-bust-half-dollar',
        name: 'Draped Bust Half Dollar',
        dateRange: '1796–1807',
        denomination: '50¢',
        image: '/coins/draped-bust-half-dollar.jpg',
        imageReverse: '/coins/draped-bust-half-dollar-reverse.jpg',
        coinNames: ['Draped Bust Half Dollar', 'Draped Bust Half Dollar Small Eagle', 'Draped Bust Half Dollar Heraldic Eagle'],
      },
      {
        slug: 'capped-bust-half-dollar',
        name: 'Capped Bust Half Dollar',
        dateRange: '1807–1839',
        denomination: '50¢',
        image: '/coins/capped-bust-half-dollar.jpg',
        imageReverse: '/coins/capped-bust-half-dollar-reverse.jpg',
        coinNames: ['Capped Bust Half Dollar'],
      },
      {
        slug: 'liberty-seated-half-dollar',
        name: 'Liberty Seated Half Dollar',
        dateRange: '1839–1891',
        denomination: '50¢',
        image: '/coins/liberty-seated-half-dollar.jpg',
        imageReverse: '/coins/liberty-seated-half-dollar-reverse.jpg',
        coinNames: ['Liberty Seated Half Dollar', 'Liberty Seated Half Dollar No Motto', 'Liberty Seated Half Dollar With Motto'],
      },
      {
        slug: 'barber-half-dollar',
        name: 'Barber Half Dollar',
        dateRange: '1892–1915',
        denomination: '50¢',
        image: '/coins/barber-half-dollar.jpg',
        imageReverse: '/coins/barber-half-dollar-reverse.jpg',
        coinNames: ['Barber Half Dollar'],
      },
      {
        slug: 'walking-liberty-half-dollar',
        name: 'Walking Liberty Half Dollar',
        dateRange: '1916–1947',
        denomination: '50¢',
        image: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Walking_Liberty_Half_Dollar_1945D_Obverse.png',
        imageReverse: 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Walking_Liberty_Half_Dollar_1945D_Reverse.png',
        coinNames: ['Walking Liberty Half Dollar', 'Walking Liberty'],
      },
      {
        slug: 'franklin-half-dollar',
        name: 'Franklin Half Dollar',
        dateRange: '1948–1963',
        denomination: '50¢',
        image: 'https://upload.wikimedia.org/wikipedia/commons/6/64/Franklin_Half_1963_D_Obverse.png',
        imageReverse: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Franklin_Half_1963_D_Reverse.png',
        coinNames: ['Franklin Half Dollar'],
      },
      {
        slug: 'kennedy-half-dollar',
        name: 'Kennedy Half Dollar',
        dateRange: '1964–present',
        denomination: '50¢',
        image: '/coins/kennedy-half-dollar.jpg',
        imageReverse: '/coins/kennedy-half-dollar-reverse.jpg',
        coinNames: ['Kennedy Half Dollar', 'Silver Kennedy Half Dollar', '40% Silver Kennedy Half Dollar', 'Clad Kennedy Half Dollar'],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // SILVER DOLLARS
  // ─────────────────────────────────────────────
  {
    slug: 'silver-dollars',
    name: 'One Dollar Pieces',
    series: [
      {
        slug: 'flowing-hair-dollar',
        name: 'Flowing Hair Dollar',
        dateRange: '1794–1795',
        denomination: '$1',
        image: '/coins/flowing-hair-dollar.jpg',
        imageReverse: '/coins/flowing-hair-dollar-reverse.jpg',
        coinNames: ['Flowing Hair Dollar'],
      },
      {
        slug: 'draped-bust-dollar',
        name: 'Draped Bust Dollar',
        dateRange: '1795–1804',
        denomination: '$1',
        image: '/coins/draped-bust-dollar-small-eagle.jpg',
        imageReverse: '/coins/draped-bust-dollar-small-eagle-reverse.jpg',
        coinNames: ['Draped Bust Dollar', 'Draped Bust Dollar Small Eagle', 'Draped Bust Dollar Heraldic Eagle'],
      },
      {
        slug: 'liberty-seated-dollar',
        name: 'Liberty Seated Dollar',
        dateRange: '1836–1873',
        denomination: '$1',
        image: '/coins/liberty-seated-dollar.jpg',
        imageReverse: '/coins/liberty-seated-dollar-reverse.jpg',
        coinNames: ['Liberty Seated Dollar', 'Gobrecht Dollar'],
      },
      {
        slug: 'trade-dollar',
        name: 'Trade Dollar',
        dateRange: '1873–1885',
        denomination: '$1',
        image: '/coins/trade-dollar.jpg',
        imageReverse: '/coins/trade-dollar-reverse.jpg',
        coinNames: ['Trade Dollar'],
      },
      {
        slug: 'morgan-dollar',
        name: 'Morgan Dollar',
        dateRange: '1878–1921',
        denomination: '$1',
        image: 'https://upload.wikimedia.org/wikipedia/commons/c/c6/1879S_Morgan_Dollar_NGC_MS67plus_Obverse.png',
        imageReverse: 'https://upload.wikimedia.org/wikipedia/commons/6/68/1879S_Morgan_Dollar_NGC_MS67plus_Reverse.png',
        coinNames: ['Morgan Dollar'],
      },
      {
        slug: 'peace-dollar',
        name: 'Peace Dollar',
        dateRange: '1921–1935',
        denomination: '$1',
        image: '/coins/peace-dollar.jpg',
        imageReverse: '/coins/peace-dollar-reverse.jpg',
        coinNames: ['Peace Dollar'],
      },
      {
        slug: 'eisenhower-dollar',
        name: 'Eisenhower Dollar',
        dateRange: '1971–1978',
        denomination: '$1',
        image: '/coins/eisenhower-dollar.jpg',
        imageReverse: '/coins/eisenhower-dollar-reverse.jpg',
        coinNames: ['Eisenhower Dollar', 'Ike Dollar'],
      },
      {
        slug: 'susan-b-anthony-dollar',
        name: 'Susan B. Anthony Dollar',
        dateRange: '1979–1999',
        denomination: '$1',
        image: '/coins/susan-b-anthony-dollar.jpg',
        imageReverse: '/coins/susan-b-anthony-dollar-reverse.jpg',
        coinNames: ['Susan B. Anthony Dollar', 'SBA Dollar'],
      },
      {
        slug: 'sacagawea-dollar',
        name: 'Sacagawea Dollar',
        dateRange: '2000–present',
        denomination: '$1',
        image: '/coins/sacagawea-dollar.jpg',
        imageReverse: '/coins/sacagawea-dollar-reverse.jpg',
        coinNames: ['Sacagawea Dollar', 'Golden Dollar'],
      },
      {
        slug: 'presidential-dollar',
        name: 'Presidential Dollar',
        dateRange: '2007–2020',
        denomination: '$1',
        image: '/coins/presidential-dollar.jpg',
        imageReverse: '/coins/presidential-dollar-reverse.jpg',
        coinNames: ['Presidential Dollar'],
      },
      {
        slug: 'american-innovation-dollar',
        name: 'American Innovation Dollar',
        dateRange: '2018–present',
        denomination: '$1',
        image: '/coins/american-innovation-dollar.jpg',
        imageReverse: '/coins/american-innovation-dollar-reverse.jpg',
        coinNames: ['American Innovation Dollar'],
      },
      {
        slug: 'morgan-dollar-2021',
        name: 'Morgan Dollar (2021 Centennial)',
        dateRange: '2021',
        denomination: '$1',
        notes: '2021 Centennial',
        image: '/coins/morgan-dollar-2021.jpg',
        imageReverse: '/coins/morgan-dollar-2021-reverse.jpg',
        coinNames: ['Morgan Dollar 2021', '2021 Morgan Dollar'],
      },
      {
        slug: 'peace-dollar-2021',
        name: 'Peace Dollar (2021 Centennial)',
        dateRange: '2021',
        denomination: '$1',
        notes: '2021 Centennial',
        image: '/coins/peace-dollar-2021.jpg',
        imageReverse: '/coins/peace-dollar-2021-reverse.jpg',
        coinNames: ['Peace Dollar 2021', '2021 Peace Dollar'],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // GOLD DOLLARS
  // ─────────────────────────────────────────────
  {
    slug: 'gold-dollars',
    name: 'Gold Dollars',
    series: [
      {
        slug: 'liberty-head-gold-dollar',
        name: 'Liberty Head Gold Dollar',
        dateRange: '1849–1854',
        denomination: '$1',
        image: '/coins/liberty-head-gold-dollar.jpg',
        imageReverse: '/coins/liberty-head-gold-dollar-reverse.jpg',
        coinNames: ['Liberty Head Gold Dollar', 'Gold Dollar Type 1'],
      },
      {
        slug: 'indian-princess-gold-dollar',
        name: 'Indian Princess Gold Dollar',
        dateRange: '1854–1889',
        denomination: '$1',
        image: '/coins/indian-princess-gold-dollar.jpg',
        imageReverse: '/coins/indian-princess-gold-dollar-reverse.jpg',
        coinNames: ['Indian Princess Gold Dollar', 'Gold Dollar Type 2', 'Gold Dollar Type 3'],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // QUARTER EAGLES ($2.50)
  // ─────────────────────────────────────────────
  {
    slug: 'quarter-eagles',
    name: 'Quarter Eagles ($2½)',
    series: [
      {
        slug: 'draped-bust-quarter-eagle',
        name: 'Draped Bust Quarter Eagle',
        dateRange: '1796–1807',
        denomination: '$2.50',
        image: '/coins/draped-bust-quarter-eagle.jpg',
        imageReverse: '/coins/draped-bust-quarter-eagle-reverse.jpg',
        coinNames: ['Draped Bust Quarter Eagle', 'Quarter Eagle'],
      },
      {
        slug: 'capped-bust-quarter-eagle',
        name: 'Capped Bust Quarter Eagle',
        dateRange: '1807–1834',
        denomination: '$2.50',
        image: '/coins/capped-bust-quarter-eagle.jpg',
        imageReverse: '/coins/capped-bust-quarter-eagle-reverse.jpg',
        coinNames: [
          'Capped Bust Right Quarter Eagle', 'Capped Bust Left Quarter Eagle',
          'Capped Head Quarter Eagle', 'Quarter Eagle',
        ],
      },
      {
        slug: 'classic-head-quarter-eagle',
        name: 'Classic Head Quarter Eagle',
        dateRange: '1834–1839',
        denomination: '$2.50',
        image: '/coins/classic-head-quarter-eagle.jpg',
        imageReverse: '/coins/classic-head-quarter-eagle-reverse.jpg',
        coinNames: ['Classic Head Quarter Eagle', 'Quarter Eagle'],
      },
      {
        slug: 'liberty-head-quarter-eagle',
        name: 'Liberty Head Quarter Eagle',
        dateRange: '1840–1907',
        denomination: '$2.50',
        image: '/coins/liberty-head-quarter-eagle.jpg',
        imageReverse: '/coins/liberty-head-quarter-eagle-reverse.jpg',
        coinNames: ['Liberty Head Quarter Eagle', 'Coronet Quarter Eagle'],
      },
      {
        slug: 'indian-head-quarter-eagle',
        name: 'Indian Head Quarter Eagle',
        dateRange: '1908–1929',
        denomination: '$2.50',
        image: '/coins/indian-head-quarter-eagle.jpg',
        imageReverse: '/coins/indian-head-quarter-eagle-reverse.jpg',
        coinNames: ['Indian Head Quarter Eagle'],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // THREE-DOLLAR GOLD
  // ─────────────────────────────────────────────
  {
    slug: 'three-dollar-gold',
    name: 'Three Dollar Pieces',
    series: [
      {
        slug: 'indian-princess-three-dollar-gold',
        name: 'Indian Princess Three-Dollar Gold',
        dateRange: '1854–1889',
        denomination: '$3',
        image: '/coins/indian-princess-three-dollar-gold.jpg',
        imageReverse: '/coins/indian-princess-three-dollar-gold-reverse.jpg',
        coinNames: ['Indian Princess Three Dollar Gold', 'Three Dollar Gold', '$3 Gold'],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // FOUR-DOLLAR GOLD (STELLA)
  // ─────────────────────────────────────────────
  {
    slug: 'four-dollar-gold',
    name: 'Four Dollar Pieces',
    series: [
      {
        slug: 'flowing-hair-stella',
        name: 'Flowing Hair Stella',
        dateRange: '1879–1880',
        denomination: '$4',
        image: '/coins/flowing-hair-stella.jpg',
        imageReverse: '/coins/flowing-hair-stella-reverse.jpg',
        coinNames: ['Flowing Hair Stella', 'Four Dollar Gold', '$4 Stella'],
      },
      {
        slug: 'coiled-hair-stella',
        name: 'Coiled Hair Stella',
        dateRange: '1879–1880',
        denomination: '$4',
        image: '/coins/coiled-hair-stella.jpg',
        imageReverse: '/coins/coiled-hair-stella-reverse.jpg',
        coinNames: ['Coiled Hair Stella', 'Four Dollar Gold', '$4 Stella'],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // HALF EAGLES ($5)
  // ─────────────────────────────────────────────
  {
    slug: 'half-eagles',
    name: 'Half Eagles ($5)',
    series: [
      {
        slug: 'draped-bust-half-eagle',
        name: 'Draped Bust Half Eagle',
        dateRange: '1795–1807',
        denomination: '$5',
        image: '/coins/draped-bust-half-eagle.jpg',
        imageReverse: '/coins/draped-bust-half-eagle-reverse.jpg',
        coinNames: ['Draped Bust Half Eagle', 'Capped Bust Right Half Eagle', 'Half Eagle'],
      },
      {
        slug: 'capped-bust-half-eagle',
        name: 'Capped Bust Half Eagle',
        dateRange: '1807–1834',
        denomination: '$5',
        image: '/coins/capped-bust-half-eagle.jpg',
        imageReverse: '/coins/capped-bust-half-eagle-reverse.jpg',
        coinNames: ['Capped Bust Half Eagle', 'Capped Bust Left Half Eagle', 'Capped Head Half Eagle', 'Half Eagle'],
      },
      {
        slug: 'classic-head-half-eagle',
        name: 'Classic Head Half Eagle',
        dateRange: '1834–1838',
        denomination: '$5',
        image: '/coins/classic-head-half-eagle.jpg',
        imageReverse: '/coins/classic-head-half-eagle-reverse.jpg',
        coinNames: ['Classic Head Half Eagle', 'Half Eagle'],
      },
      {
        slug: 'liberty-head-half-eagle',
        name: 'Liberty Head Half Eagle',
        dateRange: '1839–1908',
        denomination: '$5',
        image: '/coins/liberty-head-half-eagle.jpg',
        imageReverse: '/coins/liberty-head-half-eagle-reverse.jpg',
        coinNames: ['Liberty Head Half Eagle', 'Coronet Half Eagle'],
      },
      {
        slug: 'indian-head-half-eagle',
        name: 'Indian Head Half Eagle',
        dateRange: '1908–1929',
        denomination: '$5',
        image: '/coins/indian-head-half-eagle.jpg',
        imageReverse: '/coins/indian-head-half-eagle-reverse.jpg',
        coinNames: ['Indian Head Half Eagle'],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // EAGLES ($10)
  // ─────────────────────────────────────────────
  {
    slug: 'eagles',
    name: 'Eagles ($10)',
    series: [
      {
        slug: 'draped-bust-eagle',
        name: 'Draped Bust Eagle',
        dateRange: '1795–1804',
        denomination: '$10',
        image: '/coins/draped-bust-eagle.jpg',
        imageReverse: '/coins/draped-bust-eagle-reverse.jpg',
        coinNames: ['Draped Bust Eagle', 'Capped Bust Right Eagle', 'Eagle'],
      },
      {
        slug: 'liberty-head-eagle',
        name: 'Liberty Head Eagle',
        dateRange: '1838–1907',
        denomination: '$10',
        image: '/coins/liberty-head-eagle.jpg',
        imageReverse: '/coins/liberty-head-eagle-reverse.jpg',
        coinNames: ['Liberty Head Eagle', 'Coronet Eagle', 'Liberty Head Eagle No Motto', 'Liberty Head Eagle With Motto'],
      },
      {
        slug: 'indian-head-eagle',
        name: 'Indian Head Eagle',
        dateRange: '1907–1933',
        denomination: '$10',
        image: '/coins/indian-head-eagle.jpg',
        imageReverse: '/coins/indian-head-eagle-reverse.jpg',
        coinNames: ['Indian Head Eagle'],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // DOUBLE EAGLES ($20)
  // ─────────────────────────────────────────────
  {
    slug: 'double-eagles',
    name: 'Double Eagles ($20)',
    series: [
      {
        slug: 'liberty-head-double-eagle',
        name: 'Liberty Head Double Eagle',
        dateRange: '1849–1907',
        denomination: '$20',
        image: '/coins/liberty-head-double-eagle.jpg',
        imageReverse: '/coins/liberty-head-double-eagle-reverse.jpg',
        coinNames: [
          'Liberty Head Double Eagle', 'Liberty Double Eagle Type 1',
          'Liberty Double Eagle Type 2', 'Liberty Double Eagle Type 3',
        ],
      },
      {
        slug: 'saint-gaudens-double-eagle',
        name: 'Saint-Gaudens Double Eagle',
        dateRange: '1907–1933',
        denomination: '$20',
        image: '/coins/saint-gaudens-double-eagle.jpg',
        imageReverse: '/coins/saint-gaudens-double-eagle-reverse.jpg',
        coinNames: [
          'Saint-Gaudens Double Eagle', 'Saint Gaudens Double Eagle',
          'Saint-Gaudens Double Eagle High Relief', 'Saint Gaudens High Relief',
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // COLONIALS
  // ─────────────────────────────────────────────
  {
    slug: 'colonial',
    name: 'Colonials',
    series: [
      {
        slug: 'massachusetts-silver-coins',
        name: 'Massachusetts Silver Coins',
        dateRange: '1652–1662',
        coinNames: ['Massachusetts Silver Coin', 'Pine Tree Shilling', 'Oak Tree Coinage', 'NE Shilling'],
        image: '/coins/massachusetts-silver-coins.jpg',
        imageReverse: '/coins/massachusetts-silver-coins-reverse.jpg',
      },
      {
        slug: 'pre-1776-states-coinage',
        name: 'Pre-1776 States Coinage',
        dateRange: '1652–1774',
        coinNames: ['Pre-1776 States Coinage', 'Colonial States Coin'],
        image: '/coins/pre-1776-states-coinage.jpg',
        imageReverse: '/coins/pre-1776-states-coinage-reverse.jpg',
      },
      {
        slug: 'pre-1776-private-regional',
        name: 'Pre-1776 Private and Regional Issues',
        dateRange: '1616–1766',
        coinNames: ['Pre-1776 Private Issue', 'Rosa Americana', 'Higley Copper', 'Virginia Halfpenny'],
        image: '/coins/pre-1776-private-regional.jpg',
        imageReverse: '/coins/pre-1776-private-regional-reverse.jpg',
      },
      {
        slug: 'french-colonies',
        name: 'French Colonies',
        dateRange: '1670–1767',
        coinNames: ['French Colony Coin', 'French Colonial'],
        image: '/coins/french-colonies.jpg',
        imageReverse: '/coins/french-colonies-reverse.jpg',
      },
      {
        slug: 'post-1776-states-coinage',
        name: 'Post-1776 States Coinage',
        dateRange: '1776–1788',
        coinNames: ['Post-1776 States Coinage', 'Nova Constellatio', 'Fugio Cent'],
        image: '/coins/post-1776-states-coinage.jpg',
        imageReverse: '/coins/post-1776-states-coinage-reverse.jpg',
      },
      {
        slug: 'post-1776-private-regional',
        name: 'Post-1776 Private and Regional Issues',
        dateRange: '1778–1820',
        coinNames: ['Post-1776 Private Issue', 'Bar Cent', 'Immune Columbia Piece'],
        image: '/coins/post-1776-private-regional.jpg',
        imageReverse: '/coins/post-1776-private-regional-reverse.jpg',
      },
      {
        slug: 'proposed-national-issues',
        name: 'Proposed National Issues',
        dateRange: '1776–1787',
        coinNames: ['Proposed National Issue', 'Continental Dollar'],
        image: '/coins/proposed-national-issues.jpg',
        imageReverse: '/coins/proposed-national-issues-reverse.jpg',
      },
      {
        slug: 'washington-pieces',
        name: 'Washington Pieces',
        dateRange: '1783–1800',
        coinNames: ['Washington Piece', 'Washington Portrait Piece', 'Washington Cent'],
        image: '/coins/washington-pieces.jpg',
        imageReverse: '/coins/washington-pieces-reverse.jpg',
      },
      {
        slug: 'libertas-americana-medals',
        name: 'Libertas Americana Medals',
        dateRange: '1781',
        coinNames: ['Libertas Americana', 'Libertas Americana Medal'],
        image: '/coins/libertas-americana-medals.jpg',
        imageReverse: '/coins/libertas-americana-medals-reverse.jpg',
      },
      {
        slug: 'colonial-restrikes-fantasies',
        name: 'Colonial Restrikes and Fantasies',
        dateRange: 'Varies',
        coinNames: ['Colonial Restrike', 'Colonial Fantasy'],
        image: '/coins/colonial-restrikes-fantasies.jpg',
        imageReverse: '/coins/colonial-restrikes-fantasies-reverse.jpg',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // COMMEMORATIVES
  // ─────────────────────────────────────────────
  {
    slug: 'commemoratives',
    name: 'Commemoratives',
    series: [
      {
        slug: 'classic-silver-commemoratives',
        name: 'Silver Commemorative',
        dateRange: '1892–1954',
        denomination: 'Varies',
        image: '/coins/classic-silver-commemoratives.jpg',
        imageReverse: '/coins/classic-silver-commemoratives-reverse.jpg',
        coinNames: ['Classic Commemorative', 'Silver Commemorative', 'Classic Silver Commemorative'],
      },
      {
        slug: 'classic-gold-commemoratives',
        name: 'Gold Commemorative',
        dateRange: '1903–1926',
        denomination: 'Varies',
        coinNames: ['Gold Commemorative', 'Classic Gold Commemorative'],
        image: '/coins/classic-gold-commemoratives.jpg',
        imageReverse: '/coins/classic-gold-commemoratives-reverse.jpg',
      },
      {
        slug: 'modern-silver-clad-commemoratives',
        name: 'Modern Silver and Clad Commemoratives',
        dateRange: '1982–present',
        denomination: 'Varies',
        coinNames: ['Modern Silver Commemorative', 'Silver Commemorative Dollar', 'Modern Clad Commemorative', 'Clad Commemorative Half Dollar'],
        image: '/coins/modern-silver-clad-commemoratives.jpg',
        imageReverse: '/coins/modern-silver-clad-commemoratives-reverse.jpg',
      },
      {
        slug: 'modern-gold-commemoratives',
        name: 'Modern Gold Commemorative',
        dateRange: '1984–present',
        denomination: 'Varies',
        coinNames: ['Modern Gold Commemorative', 'Gold Commemorative Dollar'],
        image: '/coins/modern-gold-commemoratives.jpg',
        imageReverse: '/coins/modern-gold-commemoratives-reverse.jpg',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // AMERICAN EAGLE BULLION
  // ─────────────────────────────────────────────
  {
    slug: 'bullion',
    name: 'American Bullion',
    series: [
      {
        slug: 'american-silver-eagle',
        name: 'Silver Eagles',
        dateRange: '1986–present',
        denomination: '$1',
        image: '/coins/american-silver-eagle.jpg',
        imageReverse: '/coins/american-silver-eagle-reverse.jpg',
        coinNames: ['American Silver Eagle', 'Silver Eagle'],
      },
      {
        slug: 'atb-silver-quarters',
        name: '5 oz. America the Beautiful Silver Quarters',
        dateRange: '2010–present',
        denomination: '25¢',
        coinNames: ['ATB Silver Quarter', 'America the Beautiful Silver Quarter', '5 oz Silver Quarter'],
        image: '/coins/atb-silver-quarters.jpg',
        imageReverse: '/coins/atb-silver-quarters-reverse.jpg',
      },
      {
        slug: 'american-gold-eagle',
        name: 'Gold Eagles',
        dateRange: '1986–present',
        denomination: '$5/$10/$25/$50',
        image: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Liberty_%2450_Obverse.png',
        imageReverse: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Liberty_%2450_Reverse.png',
        coinNames: ['American Gold Eagle', 'Gold Eagle'],
      },
      {
        slug: 'american-platinum-eagle',
        name: 'Platinum Eagles',
        dateRange: '1997–present',
        denomination: '$10/$25/$50/$100',
        image: '/coins/american-platinum-eagle.jpg',
        imageReverse: '/coins/american-platinum-eagle-reverse.jpg',
        coinNames: ['American Platinum Eagle', 'Platinum Eagle'],
      },
      {
        slug: 'american-gold-buffalo',
        name: 'Gold Buffalos',
        dateRange: '2006–present',
        denomination: '$50',
        image: '/coins/american-gold-buffalo.jpg',
        imageReverse: '/coins/american-gold-buffalo-reverse.jpg',
        coinNames: ['American Gold Buffalo', 'Gold Buffalo'],
      },
      {
        slug: 'first-spouses',
        name: 'First Spouses',
        dateRange: '2007–present',
        denomination: '$10',
        coinNames: ['First Spouse Gold Coin', 'First Spouse'],
        image: '/coins/first-spouses.jpg',
        imageReverse: '/coins/first-spouses-reverse.jpg',
      },
      {
        slug: 'ultra-high-relief-double-eagle',
        name: 'Ultra High Relief Double Eagles',
        dateRange: '2009',
        denomination: '$20',
        coinNames: ['Ultra High Relief Double Eagle', 'UHR Double Eagle'],
        image: '/coins/ultra-high-relief-double-eagle.jpg',
        imageReverse: '/coins/ultra-high-relief-double-eagle-reverse.jpg',
      },
      {
        slug: 'american-palladium-eagle',
        name: 'Palladium $25 Eagle',
        dateRange: '2017–present',
        denomination: '$25',
        coinNames: ['American Palladium Eagle', 'Palladium Eagle'],
        image: '/coins/american-palladium-eagle.jpg',
        imageReverse: '/coins/american-palladium-eagle-reverse.jpg',
      },
      {
        slug: 'american-liberty-gold',
        name: 'American Liberty Gold',
        dateRange: '2015–present',
        denomination: '$100',
        coinNames: ['American Liberty Gold', 'American Liberty'],
        image: '/coins/american-liberty-gold.jpg',
        imageReverse: '/coins/american-liberty-gold-reverse.jpg',
      },
      {
        slug: 'liberty-and-britannia',
        name: 'Liberty and Britannia',
        dateRange: '2024–present',
        denomination: 'Varies',
        coinNames: ['Liberty and Britannia'],
        image: '/coins/liberty-and-britannia.jpg',
        imageReverse: '/coins/liberty-and-britannia-reverse.jpg',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // TERRITORIAL
  // ─────────────────────────────────────────────
  {
    slug: 'territorial',
    name: 'Territorial',
    series: [
      {
        slug: 'templeton-reid',
        name: 'Templeton Reid (Georgia)',
        dateRange: '1830–1849',
        coinNames: ['Templeton Reid'],
        image: '/coins/templeton-reid.jpg',
        imageReverse: '/coins/templeton-reid-reverse.jpg',
      },
      {
        slug: 'bechtler',
        name: 'Bechtler (N. Carolina/Georgia)',
        dateRange: '1831–1850',
        coinNames: ['Bechtler', 'Bechtler Gold'],
        image: '/coins/bechtler.jpg',
        imageReverse: '/coins/bechtler-reverse.jpg',
      },
      {
        slug: 'california-gold',
        name: 'California Gold',
        dateRange: '1849–1855',
        coinNames: ['California Gold', 'California Pioneer Gold'],
        image: '/coins/california-gold.jpg',
        imageReverse: '/coins/california-gold-reverse.jpg',
      },
      {
        slug: 'california-fractional-gold',
        name: 'California Fractional Gold',
        dateRange: '1852–1882',
        coinNames: ['California Fractional Gold'],
        image: '/coins/california-fractional-gold.jpg',
        imageReverse: '/coins/california-fractional-gold-reverse.jpg',
      },
      {
        slug: 'oregon-gold',
        name: 'Oregon Gold',
        dateRange: '1849',
        coinNames: ['Oregon Gold', 'Oregon Exchange Company'],
        image: '/coins/oregon-gold.jpg',
        imageReverse: '/coins/oregon-gold-reverse.jpg',
      },
      {
        slug: 'mormon-gold',
        name: 'Mormon Gold (Utah)',
        dateRange: '1849–1860',
        coinNames: ['Mormon Gold', 'Deseret Gold'],
        image: '/coins/mormon-gold.jpg',
        imageReverse: '/coins/mormon-gold-reverse.jpg',
      },
      {
        slug: 'colorado-gold',
        name: 'Colorado Gold',
        dateRange: '1860–1861',
        coinNames: ['Colorado Gold', 'Pikes Peak Gold'],
        image: '/coins/colorado-gold.jpg',
        imageReverse: '/coins/colorado-gold-reverse.jpg',
      },
      {
        slug: 'hawaii-coinage',
        name: 'Hawaii',
        dateRange: '1847–1891',
        coinNames: ['Hawaii Coin', 'Hawaiian Cent', 'Kalakaua Dollar'],
        image: '/coins/hawaii-coinage.jpg',
        imageReverse: '/coins/hawaii-coinage-reverse.jpg',
      },
      {
        slug: 'alaska-rural-rehabilitation',
        name: 'Alaska Rural Rehabilitation Corp.',
        dateRange: '1935',
        coinNames: ['Alaska Rural Rehabilitation', 'ARRC Token'],
        image: '/coins/alaska-rural-rehabilitation.jpg',
      },
      {
        slug: 'confederate-states',
        name: 'Confederate States of America',
        dateRange: '1861–1863',
        coinNames: ['Confederate Coin', 'Confederate Half Dollar', 'Confederate Cent'],
        image: '/coins/confederate-states.jpg',
        imageReverse: '/coins/confederate-states-reverse.jpg',
      },
      {
        slug: 'lesher-dollars',
        name: 'Lesher (Colorado) Dollars',
        dateRange: '1900–1901',
        coinNames: ['Lesher Dollar', 'Lesher Referendum Dollar'],
        image: '/coins/lesher-dollars.jpg',
        imageReverse: '/coins/lesher-dollars-reverse.jpg',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // PATTERNS
  // ─────────────────────────────────────────────
  {
    slug: 'patterns',
    name: 'Patterns',
    series: [
      {
        slug: 'patterns-1792-1859',
        name: 'Patterns',
        dateRange: '1792–1859',
        coinNames: ['Pattern', 'Pattern Coin'],
      },
      {
        slug: 'patterns-1860-1865',
        name: 'Patterns',
        dateRange: '1860–1865',
        coinNames: ['Pattern', 'Pattern Coin'],
      },
      {
        slug: 'patterns-1866-1869',
        name: 'Patterns',
        dateRange: '1866–1869',
        coinNames: ['Pattern', 'Pattern Coin'],
      },
      {
        slug: 'patterns-1870',
        name: 'Patterns',
        dateRange: '1870',
        coinNames: ['Pattern', 'Pattern Coin'],
      },
      {
        slug: 'patterns-1871-1873',
        name: 'Patterns',
        dateRange: '1871–1873',
        coinNames: ['Pattern', 'Pattern Coin'],
      },
      {
        slug: 'patterns-1874-1879',
        name: 'Patterns',
        dateRange: '1874–1879',
        coinNames: ['Pattern', 'Pattern Coin'],
      },
      {
        slug: 'patterns-1880-1942',
        name: 'Patterns',
        dateRange: '1880–1942',
        coinNames: ['Pattern', 'Pattern Coin'],
      },
      {
        slug: 'patterns-1943-present',
        name: 'Patterns',
        dateRange: '1943–present',
        coinNames: ['Pattern', 'Pattern Coin'],
      },
      {
        slug: 'die-hub-trials-splashers',
        name: 'Die Trials, Hub Trials, and Splashers',
        dateRange: '1792–1982',
        coinNames: ['Die Trial', 'Hub Trial', 'Splasher'],
      },
      {
        slug: 'privately-issued-patterns',
        name: 'Privately-issued "Patterns"',
        dateRange: '1792–1938',
        coinNames: ['Privately Issued Pattern'],
      },
    ],
  },
]

/**
 * Flat list of all series for lookup by slug.
 */
export const ALL_SERIES: CoinSeries[] = COIN_CATALOG.flatMap(cat => cat.series)

/**
 * Look up a series by its slug.
 */
export function getSeriesBySlug(slug: string): CoinSeries | undefined {
  return ALL_SERIES.find(s => s.slug === slug)
}

/**
 * Look up a category by its slug.
 */
export function getCategoryBySlug(slug: string): CoinCategory | undefined {
  return COIN_CATALOG.find(c => c.slug === slug)
}
