// constants/dictionary.ts
export const dictionary = {
  common: {
    en: {
      pass: "Pass",
      back: "Back",
      loading: "Loading ...",
      cancel: "Cancel",
      canceling: "canceling ...",
      searching: "searching",
      close: "Close",
      email: "Email",
      rankings: "RANKINGS",
      ok: "OK",
      language: "Language",
      guest: "Guest",
      login: "Log In",
      logout: "Log out",
      plan: "Plan",
      yes: "Yes",
      no: "No",
      username: "Username",
      watch: "WATCH",
      profile: "PROFILE",
      practice: "PRACTICE",
      register: "Register",
      password: "Password",
      result: "Result",
      resign: "Resign",
      matchComplete: "Match Complete",
      later: "Maybe Later",
      play: "PLAY",
      settings: "SETTINGS",
      playing: "Playing",
      aiModel: "AI MODEL",
      notSelected: "Not selected",
      records: "Records",
      local: "Local",
      or: "or",
      edit: "Edit",
      done: "Done",
      tapToDismiss: "Tap to dismiss",
    },
  },
  Home: {
    en: {
      tap: "TAP TO",
    },
  },
  Settings: {
    en: {
      accountInfo: "Account",
      notSet: "Not set",
      matchSettings: "Match",
      allowBotMatch: "Match with bots",
      enableDoubleTap: "Enable double tap(13×13)",
      information: "Information",
      privacyPolicy: "Privacy Policy",
      termsOfService: "Terms of Service",
      deleteAccount: "Delete account",
    },
  },
  AccountLinking: {
    en: {
      // email step
      titleEmail: "Enter your email",
      subtitleEmail: "We will send you a code.",
      sendCode: "Send Code",

      // otp step (共通・pathに関係なく同じ文言)
      titleOtp: "Enter verification code",
      subtitleOtp: "Check your email inbox.",
      otpLabel: "Verification Code",
      verify: "Verify",
      resend: "Resend Code",

      // selection step (signinパスの時だけ表示)
      selectionTitle: "Account Conflict",
      selectionMessage:
        "An account is already linked. Which account would you like to use?",
      thisDevice: "This Device",
      savedAccount: "Saved Account",
      confirmSelection: "Confirm Selection",

      // errors
      errorSendFailed:
        "Failed to send code. Please wait a moment and try again.",
      errorVerifyFailed: "Failed to verify code.",
    },
  },
  Profile: {
    en: {
      youAre: "YOUR RANK",
      remaining: "About {{wins}} {{winText}}",
      guestAccount: "This is a guest account",
      guestNoticeDesc:
        "Guest data is automatically deleted after 14 days of inactivity. Log in to keep your records.",
      iconUpdateFailed: "Failed to update icon.",
      usernameTaken: "This username is already taken.",
      usernameUpdateFailed: "Failed to update username.",
    },
  },
  Rank: {
    en: {
      tenK: "10k",
      nineK: "9k",
      eightK: "8k",
      sevenK: "7k",
      sixK: "6k",
      fiveK: "5k",
      fourK: "4k",
      threeK: "3k",
      twoK: "2k",
      oneK: "1k",
      oneD: "1D",
      twoD: "2D",
      threeD: "3D",
      fourD: "4D",
      fiveD: "5D",
      sixD: "6D",
      sevenD: "7D",
      eightD: "8D",
    },
  },
  RankInfoModal: {
    en: {
      title: "About Ranks",
      yourCurrentRating: "Your Current Rating", // 単語の頭文字を大文字にする（Title Case）とUIっぽくなる
      remaining: "+{{rating}} pts to {{nextRank}}!",
      allRank: "All Ranks",
      current: "Current",
      infoText: "Earn rating through matches and aim for higher ranks!",
    },
  },
  ResultModal: {
    en: {
      remaining: "About {{wins}} {{winText}} to reach {{nextRank}}",
      home: "Home",
      playAgain: "Play Again",
      newIcons: "You got new icons!",
    },
  },
  Reason: {
    en: {
      resignation: "Resignation",
      timeout: "Timeout",
      disconnection: "Disconnection",
      points: "{{points}} points",
      draw: "Draw",
    },
  },
  GameResult: {
    en: {
      // you
      yourResignationWin: "You win by resignation",
      yourResignationLoss: "You lose by resignation",
      yourTimeoutWin: "You win by timeout",
      yourTimeoutLoss: "You lose by timeout",
      yourDisconnectWin: "You win by disconnection",
      yourDisconnectLoss: "You lose by disconnection",
      yourPointsWin: "You win by {{points}} points",
      yourPointsLoss: "You lose by {{points}} points",
      // black-white
      blackResignationWin: "●Win by resignation",
      whiteResignationWin: "○Win by resignation",
      blackTimeoutWin: "●Win by timeout",
      whiteTimeoutWin: "○Win by timeout",
      blackDisconnectWin: "●Win by disconnection",
      whiteDisconnectWin: "○Win by disconnection",
      blackPointsWin: "●Win by {{points}} points",
      whitePointsWin: "○Win by {{points}} points",
      // draw
      draw: "Draw",
    },
  },
  IconSelectModal: {
    en: {
      title: "Select Icon",
    },
  },
  MyRecords: {
    en: {
      title: "RECORDS",
      empty: "No records found",
      unknown: "Unknown",
    },
  },
  LogoutModal: {
    en: {
      title: "Log out?",
    },
  },
  MatchType: {
    en: {
      title: "Game Start!",
      black: "Black",
      white: "White",
      vs: "VS",
      handicapLabel: "Handicap",
      // matchTypes オブジェクトをやめて、キーを直接並べる
      matchType_0: "Even Game",
      matchType_1: "No Komi",
      matchType_2: "2-Stone",
      matchType_3: "3-Stone",
      matchType_4: "4-Stone",
      matchType_5: "5-Stone",
      matchType_6: "6-Stone",
      matchType_7: "7-Stone",
      matchType_8: "8-Stone",
      matchType_9: "9-Stone",
    },
  },
  BotName: {
    en: {
      bot1: "Sena",
      bot2: "Luna",
      bot3: "Mr. Bunny",
    },
  },
  DeleteModal: {
    en: {
      title: "Delete account?",
      message: "This action cannot be undone.",
      confirmLabel: 'Type "{{username}}" to confirm',
      confirm: "Delete",
    },
  },
  InfoModal: {
    en: {
      title: "Rules",
      ruleTitle: "Basic Rules",
      ruleDescription: "Follows standard Japanese Go rules.",
      boardTitle: "Board Size",
      boardDescription:
        "Played on a 9x9 board (for beginners) or a 13x13 board (for intermediate players).",
      komiTitle: "Komi",
      komiDescription:
        "White receives 6.5 points as compensation for playing second.",
      timeLimitTitle: "Time Limit",
      timeLimitDescription:
        "9x9: 3 minutes + 1 second per move. 13x13: 5 minutes + 3 seconds per move. Running out of time results in a loss.",
      objectiveTitle: "Objective",
      objectiveDescription: "The player with the most territory wins.",
    },
  },
  MaintenanceModal: {
    en: {
      defaultMessage:
        "The service is currently under maintenance.\nPlease wait a moment.",
    },
  },

  ForceUpdateModal: {
    en: {
      message:
        "A new version is available. Please update to the latest version to continue.",
      updateButton: "Update",
    },
  },
  UsernameEditModal: {
    en: {
      title: "Edit Username",
      placeholder: "New username",
      helperText:
        "※ 3-12 characters using letters, numbers, and underscores (_)",
      save: "Save",
      errors: {
        required: "Please enter a username.",
        length: "Must be between 3 and 12 characters.",
        invalidFormat:
          "Only alphanumeric characters and underscores (_) are allowed.",
      },
    },
  },
} as const;
