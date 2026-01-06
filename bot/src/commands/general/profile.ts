import {
  SlashCommandBuilder,
  AttachmentBuilder,
  CommandInteraction,
} from 'discord.js';
import {
  createCanvas,
  loadImage,
  GlobalFonts,
  SKRSContext2D,
} from '@napi-rs/canvas';
import path from 'path';
import { ProfileData, createProfile } from '../../types/profiledata.js';
import * as api from '../../api/client.js';
const fontsPath = path.resolve(process.cwd(), 'assets', 'fonts');
try {
  GlobalFonts.registerFromPath(
    path.join(fontsPath, 'Fraunces-SemiBold.ttf'),
    'Fraunces'
  );
  GlobalFonts.registerFromPath(
    path.join(fontsPath, 'Fraunces-Medium.ttf'),
    'Fraunces-Medium'
  );
  GlobalFonts.registerFromPath(
    path.join(fontsPath, 'Fraunces-Bold.ttf'),
    'Fraunces-Bold'
  );
  GlobalFonts.registerFromPath(
    path.join(fontsPath, 'Quicksand-SemiBold.ttf'),
    'Quicksand'
  );
  GlobalFonts.registerFromPath(
    path.join(fontsPath, 'Quicksand-Bold.ttf'),
    'Quicksand-Bold'
  );
  GlobalFonts.registerFromPath(
    path.join(fontsPath, 'Quicksand-Medium.ttf'),
    'Quicksand-Medium'
  );
  GlobalFonts.registerFromPath(
    path.join(fontsPath, 'Quicksand-MediumItalic.ttf'),
    'Quicksand-MediumItalic'
  );
} catch (e) {
}
const GRID = {
  unit: 8, 
  u: (n: number) => n * 8, 
  row: (n: number) => n * 32, 
  col: (n: number) => n * 79, 
} as const;
const LAYOUT = {
  avatar: {
    centerX: 372,
    centerY: 468,
    radius: 215,
    borderWidth: 5,
    borderColor: '#f3d7ee', 
  },
  username: {
    x: GRID.u(85),
    y: GRID.row(13),
    maxWidth: GRID.u(106),
    fontSize: { min: 64, max: 96 },
  },
  level: {
    x: GRID.u(85),
    y: GRID.row(17) + GRID.u(2),
    fontSize: 42,
  },
  metaIcons: {
    startX: GRID.u(85) + 60,
    textFontSize: 28,
    rowHeight: GRID.u(8),
    calendar: {
      y: GRID.row(22),
    },
    clock: {
      y: GRID.row(22) + GRID.u(8),
    },
  },
  stats: {
    fontSize: 48,
    rowHeight: GRID.u(9),
    hp: {
      textX: 275,
      y: GRID.row(38) + 10,
    },
    def: {
      textX: 280,
      y: GRID.row(41) + 10,
    },
  },
  showcase: {
    centerX: 2080,
    centerY: 700,
    width: 550,
    height: 650,
    placeholderText: { fontSize: 32, color: '#ffccdd' }, 
  },
  rankRibbon: {
    x: 2080,
    y: GRID.row(37),
    fontSize: 46,
  },
  xp: {
    x: 920, 
    y: GRID.row(38) + 10, 
  },
  serverRank: {
    x: 920, 
    y: GRID.row(41) + 10, 
  },
  colors: {
    primary: '#6B3041', 
    secondary: '#9E5A70', 
    tertiary: '#853D52', 
    muted: '#BC8EA0', 
    ribbon: '#FFF5F8', 
  },
  shadow: {
    color: '#FFFFFF',
    blur: 0,
    offsetY: 2,
  },
} as const;
function fitText(
  ctx: SKRSContext2D,
  text: string,
  fontFamily: string,
  maxWidth: number,
  minSize: number,
  maxSize: number,
  bold: boolean = true
): number {
  let fontSize = maxSize;
  const weight = bold ? 'bold ' : '';
  ctx.font = `${weight}${fontSize}px ${fontFamily} `;
  while (ctx.measureText(text).width > maxWidth && fontSize > minSize) {
    fontSize -= 2;
    ctx.font = `${weight}${fontSize}px ${fontFamily} `;
  }
  return fontSize;
}
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}
export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('View your profile card.');
export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply();
  const user = interaction.user;
  const username = user.username;
  const avatarURL = user.displayAvatarURL({ extension: 'png', size: 512 });
  const response = await api.getUser(user.id);
  const apiUser = response.data?.user;
  let profileData: ProfileData;
  if (!apiUser) {
    await interaction.editReply({
      content: "You don't have a profile yet! Use `/createprofile` to start your journey.",
    });
    return;
  } else {
    const baseStats = apiUser.stats?.baseStats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    const maxHp = 100 + (baseStats.con || 10) * 5;
    const currentHp = apiUser.stats?.currentHp !== undefined ? apiUser.stats.currentHp : maxHp;
    const def = 10 + (baseStats.dex || 10);
    profileData = {
        identity: {
            username: apiUser.username,
            avatarUrl: avatarURL,
            title: apiUser.role ? apiUser.role.charAt(0).toUpperCase() + apiUser.role.slice(1) : 'Novice',
            level: apiUser.level || 1,
            createdAt: new Date(apiUser.createdAt),
            lastActive: new Date(apiUser.lastActive || Date.now()),
        },
        stats: {
            hp: { 
                current: currentHp, 
                max: maxHp 
            },
            def: def,
        },
        progression: {
            xp: { current: apiUser.xp || 0, max: (apiUser.level || 1) * 1000 },
            rank: apiUser.role || 'Novice',
            serverRank: apiUser.serverRank || 0,
        }
    };
  }
  const profilePath = path.resolve(process.cwd(), 'assets', 'profile.png');
  try {
    const profileImage = await loadImage(profilePath);
    const canvas = createCanvas(profileImage.width, profileImage.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(profileImage, 0, 0);
    const avatar = await loadImage(avatarURL);
    const { centerX, centerY, radius, borderWidth, borderColor } =
      LAYOUT.avatar;
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    const avatarSize = radius * 2;
    ctx.drawImage(
      avatar,
      centerX - radius,
      centerY - radius,
      avatarSize,
      avatarSize
    );
    ctx.restore();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
    ctx.shadowColor = LAYOUT.shadow.color;
    ctx.shadowBlur = LAYOUT.shadow.blur;
    ctx.shadowOffsetY = LAYOUT.shadow.offsetY;
    ctx.textBaseline = 'middle';
    const displayName = truncateText(profileData.identity.username, 20);
    const usernameFontSize = fitText(
      ctx,
      displayName,
      'Fraunces',
      LAYOUT.username.maxWidth,
      LAYOUT.username.fontSize.min,
      LAYOUT.username.fontSize.max,
      false
    );
    ctx.font = `${usernameFontSize}px Fraunces`;
    ctx.fillStyle = LAYOUT.colors.primary;
    ctx.textAlign = 'left';
    ctx.fillText(displayName, LAYOUT.username.x, LAYOUT.username.y);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    const lvlText = `Lvl.${profileData.identity.level}`;
    ctx.font = `${LAYOUT.level.fontSize}px Quicksand`; 
    ctx.fillStyle = LAYOUT.colors.secondary;
    ctx.fillText(lvlText, LAYOUT.level.x, LAYOUT.level.y);
    const lvlWidth = ctx.measureText(lvlText).width;
    ctx.font = `${LAYOUT.level.fontSize}px Fraunces-Medium`;
    ctx.fillStyle = LAYOUT.colors.secondary;
    ctx.fillText(
      ` · ${profileData.identity.title}`,
      LAYOUT.level.x + lvlWidth,
      LAYOUT.level.y
    );
    ctx.fillStyle = LAYOUT.colors.secondary;
    ctx.textAlign = 'left';
    ctx.font = `${LAYOUT.metaIcons.textFontSize}px Quicksand`;
    const createdDate = profileData.identity.createdAt.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }
    );
    ctx.fillText(
      createdDate,
      LAYOUT.metaIcons.startX,
      LAYOUT.metaIcons.calendar.y
    );
    const lastActive = profileData.identity.lastActive.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
      }
    );
    ctx.fillText(
      `Active ${lastActive}`,
      LAYOUT.metaIcons.startX,
      LAYOUT.metaIcons.clock.y
    );
    const drawStat = (label: string, value: string, x: number, y: number) => {
      ctx.font = `${LAYOUT.stats.fontSize}px Quicksand`; 
      ctx.fillStyle = LAYOUT.colors.secondary;
      ctx.fillText(label, x, y);
      const labelWidth = ctx.measureText(label).width;
      ctx.font = `bold ${LAYOUT.stats.fontSize}px Quicksand-Bold`; 
      ctx.fillStyle = LAYOUT.colors.tertiary;
      ctx.fillText(value, x + labelWidth, y);
    };
    drawStat(
      'HP: ',
      `${profileData.stats.hp.current}/${profileData.stats.hp.max}`,
      LAYOUT.stats.hp.textX,
      LAYOUT.stats.hp.y
    );
    drawStat(
      'DEF: ',
      `${profileData.stats.def}`,
      LAYOUT.stats.def.textX,
      LAYOUT.stats.def.y
    );
    drawStat(
      'XP: ',
      `${profileData.progression.xp.current}/${profileData.progression.xp.max}`,
      LAYOUT.xp.x,
      LAYOUT.xp.y
    );
    drawStat(
      'Rank: ',
      `#${profileData.progression.serverRank}`,
      LAYOUT.serverRank.x,
      LAYOUT.serverRank.y
    );
    ctx.font = `${LAYOUT.showcase.placeholderText.fontSize}px Quicksand-MediumItalic`;
    ctx.fillStyle = LAYOUT.colors.muted;
    ctx.textAlign = 'center';
    if (profileData.showcase?.imageUrl) {
      ctx.fillText(
        '[Showcase Image]',
        LAYOUT.showcase.centerX,
        LAYOUT.showcase.centerY
      );
    } else {
      ctx.fillText(
        'No Showcase',
        LAYOUT.showcase.centerX,
        LAYOUT.showcase.centerY - 20
      );
      ctx.fillText(
        'Item Set',
        LAYOUT.showcase.centerX,
        LAYOUT.showcase.centerY + 20
      );
    }
    ctx.font = `${LAYOUT.rankRibbon.fontSize}px Fraunces-Bold`;
    ctx.fillStyle = LAYOUT.colors.ribbon;
    ctx.textAlign = 'center';
    ctx.fillText(
      profileData.progression.rank.toUpperCase(),
      LAYOUT.rankRibbon.x,
      LAYOUT.rankRibbon.y
    );
    const attachment = new AttachmentBuilder(await canvas.encode('png'), {
      name: 'profile.png',
    });
    await interaction.editReply({ files: [attachment] });
  } catch (error) {
    console.error('Profile card generation failed:', error);
    await interaction.editReply('Failed to load profile assets.');
  }
}
