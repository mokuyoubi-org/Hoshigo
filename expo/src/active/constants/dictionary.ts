export const dictionary = {
  common: {
    en: {
      pass: "Pass",
      back: "Back",
      loading: "Loading...",
      cancel: "Cancel",
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
      cloud: "Cloud",
      local: "Local",
    },
  },
  Home: {
    en: {
      tagline: "Online Go Matches",
      titleMain: "星碁",
      titleReading: "HOSHIGO",
      tap: "TAP TO",
      loginRequired: "Please log in to start a match",
      online: "Online",
      remaining: "Left Today",
    },
  },
  Settings: {
    en: {
      accountInfo: "Account",
      notSet: "Not set",
      customize: "Customize",
      matchSettings: "Match",
      allowBotMatch: "Match with bots",
      information: "Information",
      privacyPolicy: "Privacy Policy",
      termsOfService: "Terms of Service",
      license: "License",
      deleteAccount: "Delete account",
      loginRequired: "Please log in to continue",
    },
  },
  Profile: {
    en: {
      youAre: "YOUR GROUP",
      remaining: "About {{wins}} {{winText}}",
    },
  },
  Group: {
    en: {
      white: "White",
      pink: "Pink",
      orange: "Orange",
      yellow: "Yellow",
      green: "Green",
      blue: "Blue",
      sky1: "Sky★",
      sky2: "Sky★★",
      sky3: "Sky★★★",
      rainbow1: "Rainbow★",
      rainbow2: "Rainbow★★",
      rainbow3: "Rainbow★★★",
      moon1: "Moon★",
      moon2: "Moon★★",
      moon3: "Moon★★★",
      star1: "Star★",
      star2: "Star★★",
      star3: "Star★★★",
    },
  },
  Login: {
    en: {
      welcome: "Welcome back",
      subtitle: "Log in to your account",
      emailValidation: "Please enter a valid email address",
      passwordValidation: "Please enter at least 6 characters",
      forgotPassword: "Forgot password?",
      or: "or",
      guestLogin: "Guest Login",
      noAccount: "Don't have an account?",
      errorInvalidCredentials: "Invalid email or password",
      errorEmailNotConfirmed:
        "Email not confirmed yet. Please check your email",
    },
  },
  RegisterProfile: {
    en: {
      title: "Account Setup",
      subtitle: "Choose your username",
      usernamePlaceholder: "yourname",
      usernameValidation:
        "Username must be {{min}}-{{max}} letters, numbers, or underscores",
      errorUsernameInvalid:
        "Username must be {{min}}-{{max}} letters, numbers, or underscores",
      errorUsernameTaken: "This username is already taken",
      errorRegistrationFailed: "Failed to register username",
      successMessage: "Registration successful!",
    },
  },
  RegisterEmailPassword: {
    en: {
      title: "Create Account",
      subtitle: "Register and check your email",
      emailValidation: "Please enter a valid email address",
      passwordValidation: "Please enter at least 6 characters",
      errorRegistrationFailed: "Registration failed",
    },
  },
  ForgotPassword: {
    en: {
      title: "Forgot Password?",
      subtitle:
        "Enter your registered email address.\nWe'll send you a login link.",
      emailValidation: "Please enter a valid email address",
      sendButton: "Send Email",
      errorInvalidEmail: "Please enter a valid email address",
      errorSendFailed: "Failed to send email. Please try again",
      successTitle: "Email Sent",
      successMessage:
        "We've sent a login link to {{email}}.\n\nPlease check your email and click the link to log in.\n\nIf you don't see the email, please check your spam folder.",
      backToLogin: "Back to Login",
      resendDifferent: "Resend to different address",
    },
  },
  GroupInfoModal: {
    en: {
      title: "About Groups",
      yourCurrentPoint: "Your current points",
      remaining: "{{points}}pt until {{nextGroup}}!",
      allGroup: "All Groups",
      until: "{{points}}pt until {{nextGroup}}",
      current: "Current",
      infoText: "Get points through matches and aim for higher groups!",
    },
  },
  ResultModal: {
    en: {
      remaining: "About {{wins}} {{winText}} to reach {{nextGroup}}",
      home: "Home",
      playAgain: "Play Again",
    },
  },
  GameResult: {
    en: {
      yourResignationWin: "You win by resignation",
      yourResignationLoss: "You lose by resignation",
      yourTimeoutWin: "You win by timeout",
      yourTimeoutLoss: "You lose by timeout",
      yourDisconnectWin: "You win by disconnection",
      yourDisconnectLoss: "You lose by disconnection",
      yourPointsWin: "You win by {{points}} points",
      yourPointsLoss: "You lose by {{points}} points",
      blackResignationWin: "●Win by resignation",
      whiteResignationWin: "○Win by resignation",
      blackTimeoutWin: "●Win by timeout",
      whiteTimeoutWin: "○Win by timeout",
      blackDisconnectWin: "●Win by disconnection",
      whiteDisconnectWin: "○Win by disconnection",
      blackPointsWin: "●Win by {{points}} points",
      whitePointsWin: "○Win by {{points}} points",
    },
  },
  RegisterEmailSent: {
    en: {
      title: "Email Sent",
      description:
        "We've sent a confirmation email to your address.\n\nPlease tap the link in the email to complete verification.\n\nIf you don't receive the email, please check your spam folder.",
      backToLogin: "Back to Login",
    },
  },
  IconSelectorModal: {
    en: {
      title: "Select Icon",
    },
  },
  GoogleSignInButton: {
    en: {
      signIn: "Sign in with Google",
    },
  },
  MyRecords: {
    en: {
      title: "RECORDS",
      empty: "No records found",
      unknown: "Unknown",
    },
  },
  Matching: {
    en: {
      title: "Finding an opponent",
    },
  },
  LogoutModal: {
    en: {
      title: "Log out?",
    },
  },
  Delete: {
    en: {
      title: "Delete Account",
      subtitle: "This action cannot be undone",
      warning:
        "Deleting your account will permanently remove all your data including game records, points, and settings. This action is irreversible.",
      deleteButton: "Delete my account",
    },
  },
  DeleteModal: {
    en: {
      title: "Are you absolutely sure?",
      message:
        "Once deleted, your account cannot be recovered.\nDo you really want to proceed?",
      confirm: "Yes, delete it",
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
      title: "Maintenance",
      message:
        "The service is currently under maintenance.\nPlease wait a moment.",
    },
  },
} as const;
