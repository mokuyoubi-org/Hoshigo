// dictionary.ts
export const dictionary = {
  common: {
    en: {
      pass: "Pass",
      back: "Back",
      loading: "Loading",
      download: "Download",
      downloading: "Downloading",
      preparing: "Preparing",
      cancel: "Cancel",
      canceling: "Canceling",
      searching: "Searching",
      close: "Close",
      email: "Email",
      rankings: "Rankings",
      ok: "OK",
      language: "Language",
      guest: "Guest",
      login: "Log In",
      logout: "Log out",
      yes: "Yes",
      no: "No",
      username: "Username",
      profile: "Profile",
      register: "Register",
      result: "Result",
      resign: "Resign",
      matchComplete: "Match Complete",
      play: "Play",
      settings: "Settings",
      records: "Records",
      otaVersion: "OTA Version",
      appVersion: "App Version",
      information: "Information",
      unknown: "Unknown",
      black: "Black",
      white: "White",
      playAgain: "Play Again",
      playBot: "Play Bot",
      bot: "Bot",
      match: "Match",
      practice: "Practice",
      onlineMatch: "Online Match",
      nineBoard: "9×9",
      thirteenBoard: "13×13",
      nineteenBoard: "19×19",
      version: "Version",
      device: "Device",
      sound: "Sound",
      aiModels: "AI Models",
      player: "Player",
      user: "User",
      pleaseWait: "Please wait a moment",
      country: "Country",
      international: "International",
    },
  },
  Settings: {
    en: {
      accountInfo: "Account",
      notSet: "Not set",
      matchSettings: "Match",
      allowBotMatch: "Match with bots",
      privacyPolicy: "Privacy Policy",
      termsOfService: "Terms of Service",
      deleteAccount: "Delete account",
      doubleTap: "Double Tap",
    },
  },
  EmailChange: {
    en: {
      titleEmail: "Change Email",
      titleOtp: "Enter Code",
      subtitleEmail: "Enter your new email address.",
      newEmail: "New Email",
      sendCode: "Send Code",
      subtitleOtp: "Enter the code sent to {{email}}.",
      otpLabel: "Verification Code",
      verify: "Verify",
      errorSendFailed: "Failed to send the code. Please try again.",
      errorVerifyFailed:
        "Verification failed. Please check the code and try again.",
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
      youAre: "You are",
      remaining: "About {{wins}} {{winText}}",
      guestAccount: "This is a guest account",
      guestNoticeDesc:
        "Guest account is automatically deleted after 14 days of inactivity. Log in to keep your records.",
      iconUpdateFailed: "Failed to update icon.",
      usernameTaken: "This username is already taken.",
      usernameUpdateFailed: "Failed to update username.",
      practice: "Practice",
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
      title: "Your Rating",
      remaining: "+ {{rating}} to {{nextRank}} !",
      allRank: "All Ranks",
      infoText: "Earn rating through matches and aim for higher ranks!",
    },
  },
  ResultModal: {
    en: {
      remaining: "About {{wins}} {{winText}} to reach {{nextRank}}",
      home: "Home",

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
      void: "Void",
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
      blackResignationWin: "Black win by resignation",
      whiteResignationWin: "White win by resignation",
      blackTimeoutWin: "Black win by timeout",
      whiteTimeoutWin: "White win by timeout",
      blackDisconnectWin: "Black win by disconnection",
      whiteDisconnectWin: "White win by disconnection",
      blackPointsWin: "Black win by {{points}} points",
      whitePointsWin: "White win by {{points}} points",
      // draw
      draw: "Draw",
      void: "Void",
    },
  },

  IconSelectModal: {
    en: {
      title: "Select Icon",
    },
  },
  MyRecords: {
    en: {
      empty: "No records found",
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
      matchType_13: "13-Stone",
      matchType_16: "16-Stone",
      matchType_25: "25-Stone",
    },
  },
  BotName: {
    en: {
      bot1: "Sena",
      bot2: "Luna",
      bot3: "Mr.Bunny",
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
        "Played on a 9x9 board (for beginners) or a 13x13 board (for intermediate players) or a 19x19 board (for advanced players).",
      komiTitle: "Komi",
      komiDescription:
        "White receives 6.5 points as compensation for playing second.",
      timeLimitTitle: "Time Limit",
      timeLimitDescription:
        "9x9: 3 minutes + 1 second per move. 13x13: 5 minutes + 3 seconds per move. 19x19: 10 minutes + 5 seconds per move. Running out of time results in a loss.",
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

  UpdateModal: {
    en: {
      message:
        "A new version is available. Please update to the latest version to continue.",
      updateButton: "Update",
      reloadMessage:
        "A new version is available. Please reload the page to continue. If reloading doesn't help, please wait a few minutes and try again.",
      reloadButton: "Reload",
      restartMessage:
        "An update has been downloaded. Please restart the app to continue.If restarting doesn't help, please wait a few minutes and try again.",
      restartButton: "Restart",
    },
  },
  UsernameEditModal: {
    en: {
      title: "Edit Username",
      placeholder: "New username",
      helperText:
        "※ 1-8 characters using letters, numbers, and underscores (_)",
      save: "Save",
      errors: {
        required: "Please enter a username.",
        length: "Must be between 1 and 8 characters.",
        invalidFormat:
          "Only alphanumeric characters and underscores (_) are allowed.",
      },
    },
  },
  Practice: {
    en: {
      setupTitle: "Practice Setup",
      boardSize: "Board Size",
      myColor: "My Color",
      handicap: "Handicap",
      bot: "Bot",
      start: "Start",
      botThinking: "Bot is thinking...",
    },
  },
  AI: {
    en: {
      connecting: "Connecting to AI engine...",
      downloading: "Downloading AI model...",
      warming_up: "Starting AI engine...",
      errorTitle: "Failed to prepare AI engine",
      download_required_match:
        "Downloading the AI is required to play a match at this rank.",
      download_required_practice:
        "Downloading the AI is required to use this bot.",
    },
  },

  Analysis: {
    en: {
      ownership: "Ownership",
      winRate: "Win Rate",
      candidates: "Candidates",
      scoreLead: "Score Lead",
      moveEvaluation: "Move Evaluation",
    },
  },
} as const;
