export const dashcards = [
  {
    name: "Completed",
    boards: ["Program Specialist"],
    list: ["Completed (Program Specialist)"],
  },
  {
    name: "Draft Auths",
    boards: ["Program Specialist"],
    listNot: ["Completed"],
    typeOfRequest: "Draft Change",
  },
  {
    name: "New Request",
    boards: ["Program Specialist"],
    list: ["New Request"],
  },
  {
    name: "Assigned New Request",
    boards: ["Program Specialist"],
    list: ["Assigned New Request"],
  },
  {
    name: "Working",
    boards: ["Program Specialist"],
    list: ["Working"],
  },
  {
    name: "Stale",
    boards: ["Program Specialist"],
    list: ["Stale"],
  },
  {
    name: "Email Out Unscheduled",
    boards: ["PS Intro Call"],
    list: [
      "Email Out to Client (check to see if scheduled on calendar) (Create Due date for X amount of days for FU)",
    ],  
  },
  {
    name: "Total Unscheduled",
    boards: ["PS Intro Call"],
    list: [
      "Email Out to Client (check to see if scheduled on calendar) (Create Due date for X amount of days for FU)",
      "New Request (Link to Note Tag)",
    ],
  },
  {
    name: "Total New Requests", // ?? Faltan las condiciones
    boards: [],
    list: [],
  },
  {
    name: "Total Scheduled",
    boards: ["PS Intro Call"],
    list: ["Scheduled (Talk to Dez about Cal Link)"],
  },
  {
    name: "Monthly Completed",
    boards: ["PS Intro Call"],
    list: ["Completed (Auto Archive EOM & Once completed, remove tags)"],
  },
  {
    name: "LOOKER BOARD", // ?? Faltan las condiciones
    boards: [],
    list: [],
  },
  {
    name: "SCORES AND FEEDBACK", // ?? Faltan las condiciones
    boards: [],
    list: [],
  },
  {
    name: "15+ days Uncompleted",
    boards: [
      "PS Board: Celia",
      "Program Specialist",
      "PS Board: Crista",
      "PS Board: Eric",
      "PS Board: Holly",
      "PS Board: Janay",
      "PS Board: Kim",
      "PS Board: LUSA",
      "PS Board: Marina",
      "PS Board: Mia Rocello",
      "PS Board: Miriam",
      "PS Board: Nicolas",
      "PS Board: Priority",
      "PS Board: Stephanie",
      "PS Board: Zain",
    ],
    list: ["Working (Program Specialist)", "Working", "Follow up:"],
    created: "earlier than 15 days ago",
  },
  {
    name: "30+ Days uncompleted", // ?? Faltan las condiciones
    boards: [],
    list: [],
  },
  {
    name: "2+ Days Uncompleted",
    boards: ["Program Specialist"],
    list: ["New Request", "Working"],
    created: "earlier than 2 days ago",
  },
  {
    name: "3+ Days Uncompleted",
    boards: ["Program Specialist"],
    list: ["New Request", "Working"],
    created: "earlier than 3 days ago",
  },
  {
    name: "4+ Days Uncompleted",
    boards: ["Program Specialist"],
    list: ["New Request", "Working"],
    created: "earlier than 4 days ago",
  },
  {
    name: "5+ Days Uncompleted",
    boards: ["Program Specialist"],
    list: ["New Request", "Working"],
    created: "earlier than 5 days ago",
  },
  {
    name: "6+ Days Uncompleted",
    boards: ["Program Specialist"],
    list: ["New Request", "Working"],
    created: "earlier than 6 days ago",
  },
  {
    name: "PS Task Volume", // ?? Faltan las condiciones
    boards: [],
    list: [],
  },
];
