// T-07's choices are kept per run. The tracker exposes tone, not the numeric score.
export const transmissions = [
  '……T-07 信号丢失。重复，T-07 信号丢失。',
  '声呐锁定。它在往下走。',
  '破冰艇抵达。把它逼回水面。',
  '热泉区的毒液罐失联。保持距离。',
  '军事清剿授权已下达。目标：T-07。不留活体。',
  '它还在往下。我们……跟不上了。'
];

export function newStory() {
  return {
    alert: 0, radio: transmissions[0], radioUntil: 8, seen: new Set(),
    bypassed: 0, huntedLarge: false, defeated: new Set(), whale: null, venom: false,
    still: 0, pending: null, ending: null, endless: false, rageUntil: 0
  };
}

export function raiseAlert(story, amount) {
  story.alert = Math.max(0, Math.min(100, story.alert + amount));
}

export function alertBand(alert) {
  return alert <= 30 ? 0 : alert <= 60 ? 1 : alert <= 90 ? 2 : 3;
}

export const encounters = {
  prologue: {
    title: '逃离实验室',
    text: '水槽裂开了。编号 T-07 第一次听见玻璃之外的海。上方的船灯正从裂口扫过。',
    choices: [['dive', '离开水槽', transmissions[0]]]
  },
  boat: {
    title: '珊瑚浅海 · 船影',
    text: '船底的灯光掠过礁石。你能听见甲板上的脚步，还有人在呼叫你的编号。',
    choices: [['near', '靠近船影', '它看到我们了？它在往上看。'], ['away', '贴着礁石下潜', '通知捕捞队，浅海区拉网。']]
  },
  net: {
    title: '幽暗海沟 · 沉网',
    text: '渔网挡住了下潜路线。暗处的网结松了，正中却有足够的距离冲过去。',
    choices: [['gap', '钻过破口', '它钻过去了。它知道破口在哪。'], ['ram', '撞开渔网', '它撞穿了网！它生气了！']]
  },
  ice: {
    title: '冰封海域 · 破冰艇',
    text: '破冰艇把探照灯打进冰层。它的侧翼暴露了，另一侧有条狭窄裂隙。',
    choices: [['fight', '迎战破冰艇', '锁定。它回头了。'], ['bypass', '穿过冰下裂隙', '它没打，它直接跑了。']]
  },
  venom: {
    title: '火山热泉 · 毒液罐',
    text: '罐体在水压下渗出绿色液体。它的气味，和实验室里的饲料一模一样。',
    choices: [['eat', '吞噬毒液罐', '毒液罐空了。它在吃我们的武器。'], ['leave', '避开毒液', '毒液罐还在。它没碰。']]
  },
  ruins: {
    title: '远古遗迹 · 第二台潜航器',
    text: '第一台潜航器沉进遗迹。仍有一台在追踪你，通往深渊的缺口就在脚下。',
    choices: [['fight', '迎战第二台', '第二台接管照明。保持阵型。'], ['bypass', '趁势潜入深渊', '它放过了第二台，它在留力？']]
  },
  whale: {
    title: '深渊 · 蓝鲸',
    text: '黑暗里的声音没有念你的编号。蓝鲸在面前缓缓经过，远处有机甲的灯。',
    choices: [['pass', '绕过蓝鲸', '它绕过了鲸。它还有底线。'], ['devour', '吞噬蓝鲸', '它吃了鲸。它把鲸吃了。'], ['resonate', '与蓝鲸共鸣', '它们在一起叫。那不是鱼的声音。']]
  }
};

export function endingChoices(story) {
  const options = [['endless', '继续下潜', '通讯中断。下方还有更深的海。']];
  if (story.whale === 'pass' && story.alert < 20) {
    options.push(['rest', '停留在残骸旁', '第一缕鱼群游过你的身边。这里再也没有人呼叫 T-07。']);
  }
  if (story.whale === 'resonate') {
    options.push(['symbiosis', '和蓝鲸一起离开', '蓝鲸从光柱中游来，你们一起消失在看不见的海里。']);
  }
  if (story.whale === 'devour' && story.alert > 80 && story.defeated.size === 6
    && story.ruinsSecond) {
    options.push(['revenge', '返回浅海', '渔船队的灯光突然熄灭。巨大的影子在船底升起。']);
  }
  return options;
}
