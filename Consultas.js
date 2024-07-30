import dotenv from "dotenv";
import fs from "fs";
import { dashcards } from "./TaskBoardTracker.js";
dotenv.config();

const apiKey = process.env.API_KEY;
const token = process.env.TOKEN;

const idOrganizations = "64a86c7ab6a58bf68c0f86d6";

/**
 *
 * @returns {Promise<Array>} Retorna un array con los boards de la organizacion
 */
export async function fetchBoardsOfOrganization() {
  const url = `https://api.trello.com/1/organizations/${idOrganizations}/boards?key=${apiKey}&token=${token}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ❌`);
    }

    const data = await response.json();

    const dataFormatted = [];
    data.forEach((board) => {
      if (board.closed) return; // si esta cerrado no lo guardamos

      dataFormatted.push({
        id: board.id,
        name: board.name,
        desc: board.desc,
        closed: board.closed,
        idOrganization: board.idOrganization,
        url: board.url,
        shortUrl: board.shortUrl,
      });
    });

    // fs.writeFileSync("boards.json", JSON.stringify(dataFormatted, null, 2));
    // console.log("Data saved to 'boards.json'");
    console.log("Boards obtenidos correctamente ✅");
    return dataFormatted;
  } catch (err) {
    console.log(err);
    throw new Error("Error al obtener los datos de los boards ❌");
  }
}

/**
 *
 * @param {int} idBoard  id del board
 * @param {Array} list  lista del board
 * @returns {Promise<Array>} Retorna un array con las cards del board con la fecha de creacion
 */
export async function fetchCardsOfBoardWithDateCreate(idBoard, list) {
  const url = `https://api.trello.com/1/boards/${idBoard}/cards?key=${apiKey}&token=${token}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ❌`);
    }

    const data = await response.json();

    const dataFormatted = [];

    for (let i = 0; i < data.length; i++) {
      const card = data[i];

      if (card.closed || card.manualCoverAttachment) continue; // si esta cerrado o tiene un attachment manual no lo guardamos (manualCoverAttachment)
      let categoria = "";
      list.forEach((l) => {
        if (l.id === card.idList) {
          categoria = l.name;
        }
      });

      const creationDate = await fetchCardCreationDate(card.id);

      dataFormatted.push({
        id: card.id,
        name: card.name,
        desc: card.desc,
        dateLastActivity: card.dateLastActivity,
        creationDate: creationDate,
        closed: card.closed,
        manualCoverAttachment: card.manualCoverAttachment,
        dueComplete: card.dueComplete,
        idBoard: card.idBoard,
        idList: card.idList,
        categoria,
        url: card.url,
        shortUrl: card.shortUrl,
      });

      // esperar 1 segundo para no hacer muchas peticiones seguidas
      //   await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    // fs.writeFileSync("cards.json", JSON.stringify(dataFormatted, null, 2));
    // console.log("Data saved to 'cards.json'");
    console.log("Cards obtenidos correctamente ✅");
    return dataFormatted;
  } catch (err) {
    console.log(err);
    throw new Error("Error al obtener los datos de los cards ❌");
  }
}

/**
 *
 * @param {int} idBoard  id del board
 * @param {array} list  lista del board
 * @returns {Promise<Array>} Retorna un array con las cards del board
 */
export async function fetchCardsOfBoard(idBoard, list) {
  const url = `https://api.trello.com/1/boards/${idBoard}/cards?key=${apiKey}&token=${token}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ❌`);
    }

    const data = await response.json();

    const dataFormatted = [];

    for (let i = 0; i < data.length; i++) {
      const card = data[i];

      if (card.closed || card.manualCoverAttachment) continue; // si esta cerrado o tiene un attachment manual no lo guardamos (manualCoverAttachment)
      let categoria = "";
      list.forEach((l) => {
        if (l.id === card.idList) {
          categoria = l.name;
        }
      });

      dataFormatted.push({
        id: card.id,
        name: card.name,
        desc: card.desc,
        dateLastActivity: card.dateLastActivity,
        closed: card.closed,
        manualCoverAttachment: card.manualCoverAttachment,
        dueComplete: card.dueComplete,
        idBoard: card.idBoard,
        idList: card.idList,
        categoria,
        url: card.url,
        shortUrl: card.shortUrl,
      });
    }

    // fs.writeFileSync("cards.json", JSON.stringify(dataFormatted, null, 2));
    // console.log("Data saved to 'cards.json'");
    console.log("Cards obtenidos correctamente ✅");
    return dataFormatted;
  } catch (err) {
    console.log(err);
    throw new Error("Error al obtener los datos de los cards ❌");
  }
}

/**
 *
 * @param {int} idCard  id de la card
 * @returns {Promise<Object>} Retorna un objeto con los actions de la card
 */
export async function fetchActionsOfCard(idCard) {
  const url = `https://api.trello.com/1/cards/${idCard}/actions?filter=all&key=${apiKey}&token=${token}`; // obtiene todas las acciones
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ❌`);
    }

    const result = await response.json();

    const { data } = result[0];
    const {
      data: { list },
    } = result[1];

    const dataFormatted = { ...data, list };
    console.log("Actions obtenidos correctamente ✅");
    // console.log(JSON.stringify(dataFormatted, null, 2));
    return dataFormatted;
  } catch (err) {
    console.log(err);
    throw new Error("Error al obtener los datos de los actions ❌");
    return {};
  }
}

/**
 * Obtiene las listas de un board, las listas son las columnas de un board
 * @param {int} idBoard id del board
 * @returns {Promise<Array>} Retorna un array con las listas del board
 */
export async function fetchListsOfBoard(idBoard) {
  const url = `https://api.trello.com/1/boards/${idBoard}/lists?key=${apiKey}&token=${token}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ❌`);
    }

    const result = await response.json();

    // fs.writeFileSync("actions.json", JSON.stringify(dataFormatted, null, 2));
    // console.log("Data saved to 'actions.json'");
    // console.log(JSON.stringify(result, null, 2));
    console.log("Listas obtenidas correctamente ✅");
    return result;
  } catch (err) {
    console.log(err);
    throw new Error("Error al obtener las listas del board ❌");
  }
}

/**
 *
 * @param {int} idCard id de la card
 * @returns {Promise<String>} Retorna la fecha de creacion de la card
 */
export async function fetchCardCreationDate(idCard) {
  //   const url = `https://api.trello.com/1/cards/${idCard}/actions?filter=emailCard&key=${apiKey}&token=${token}`;
  const url = `https://api.trello.com/1/cards/${idCard}/actions?filter=all&key=${apiKey}&token=${token}`; // obtiene todas las acciones
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ❌`);
    }

    const actions = await response.json();

    if (actions.length === 0) {
      console.log("No hay acciones ❌");
      return "";
    }

    actions.sort((a, b) => new Date(a.date) - new Date(b.date));
    const firstAction = actions[0];

    console.log("Fecha de creacion de la card obtenida correctamente ✅");
    return firstAction.date;
  } catch (err) {
    console.log(err);
    throw new Error("Error al obtener la fecha de creacion de la card ❌");
  }
}

/**
 * Obtiene los custom fields de un board, los custom fields son campos personalizados de un board
 * @param {int} idBoard id del board
 * @returns {Promise<Array>} Retorna un array con los custom fields del board
 */
export async function fetchListCustomField(idBoard) {
  const url = `https://api.trello.com/1/boards/${idBoard}/customFields?filter=all&key=${apiKey}&token=${token}`; // obtiene todas las acciones
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ❌`);
    }

    const customField = await response.json();

    console.log("Custom Field obtenidos correctamente ✅");
    // console.log(JSON.stringify(customField, null, 2));

    return customField;
  } catch (err) {
    console.log(err);
    throw new Error("Error al obtener la fecha de creacion de la card ❌");
  }
}

/**
 *
 * @param {idCard} idCard id de la card
 * @returns {Promise<Array>} Retorna un array con los custom field items de la card
 */
export async function fetchCustomFieldItems(idCard) {
  const url = `https://api.trello.com/1/cards/${idCard}/customFieldItems?key=${apiKey}&token=${token}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ❌`);
    }

    const customFieldItems = await response.json();

    console.log("Custom Field Items obtenidos correctamente ✅");
    // console.log(JSON.stringify(customFieldItems, null, 2));

    return customFieldItems;
  } catch (err) {
    console.log(err);
    throw new Error("Error al obtener el fiel items de la card ❌");
    return [];
  }
}

/**
 * Obtiene los boards unicos que se usan en el "Task Board Tracker"
 * @returns {Array} Retorna un array con los boards unicos que se usan en el "Task Board Tracker"
 */
export function boardsUnicos() {
  const allBoardDashCards = [];
  dashcards.forEach((dashcard) => {
    allBoardDashCards.push(dashcard.boards);
  });
  const allBoardsUnicos = allBoardDashCards
    .flat()
    .filter((item, index, array) => array.indexOf(item) === index);

  // console.log(allBoardsUnicos, allBoardsUnicos.length);
  return allBoardsUnicos;
}

export function guardarDatosEnArchivo(
  data,
  nombreArchivo,
  carpeta = "Consultas"
) {
  try {
    fs.writeFileSync(
      `${carpeta}/${nombreArchivo}`,
      JSON.stringify(data, null, 2)
    );
    console.log(`Data saved to '${nombreArchivo}' ✅`);
  } catch (error) {
    console.log(error);
  }
}

export async function fetchBoardsOfOrganizationMoreSave() {
  try {
    const listBoards = await fetchBoardsOfOrganization();
    guardarDatosEnArchivo(listBoards, "boards.json");
    return listBoards;
  } catch (error) {
    console.log(error);
  }
}

export async function fetchCardsOfBoardWithDateCreateMoreSave(idBoard, list) {
  try {
    const cards = await fetchCardsOfBoardWithDateCreate(idBoard, list);
    guardarDatosEnArchivo(cards, `${idBoard}.json`);
    return cards;
  } catch (error) {
    console.log(error);
  }
}

export async function fetchCardsOfBoardMoreSave(idBoard, list) {
  try {
    const cards = await fetchCardsOfBoard(idBoard, list);
    guardarDatosEnArchivo(cards, `${idBoard}.json`);
    return cards;
  } catch (error) {
    console.log(error);
  }
}

export async function fetchListsOfBoardMoreSave(idBoard) {
  try {
    const list = await fetchListsOfBoard(idBoard);
    guardarDatosEnArchivo(list, `list_${idBoard}.json`);
    return list;
  } catch (error) {
    console.log(error);
  }
}

export async function fetchListCustomFieldMoreSave(idBoard) {
  try {
    const customFields = await fetchListCustomField(idBoard);
    guardarDatosEnArchivo(customFields, `customFields_${idBoard}.json`);
    return customFields;
  } catch (error) {
    console.log(error);
  }
}

/**
 *
 * @param {value} value valor a verificar si esta vacio
 * @returns {boolean} Retorna true si el valor es null, undefined, un arreglo vacio o un objeto vacio, de lo contrario retorna false
 */
export function isEmpty(value) {
  // Verificar si el valor es null o undefined
  if (value == null) return true;

  // Verificar si el valor es un arreglo
  if (Array.isArray(value)) return value.length === 0;

  // Verificar si el valor es un objeto
  if (typeof value === "object") return Object.keys(value).length === 0;

  // Si no es ni arreglo ni objeto, no se considera vacío
  return false;
}

export async function getDateTaskBoardTracker(listBoards) {
  /*
    [
      {
        name: "Call Back",
        boards: [
          "CSM Board: Josh",
          "CSS Board: Adrian",
          "CSS Board: Alexandra",
          "CSS Board: Alexis",
          "CSS Board: Brittney",
          "CSS Board: Carolyn",
          "CSS Board: Dane",
          "CSS Board: David",
          "CSS Board: Don",
          "CSS Board: Eric Bluehawk",
          "CSS Board: Eric Sismaet",
          "CSS Board: Irma",
          "CSS Board: Janay",
          "CSS Board: Jill",
          "CSS Board: Karel",
          "CSS Board: Marcella",
          "CSS Board: Micah",
          "CSS Board: Michael",
          "CSS Board: Rich",
        ],
        list: ["Done"],
        status: "Call Back",
        completed: "this month",
      },
    ]
  */

  for (let i = 5; i < dashcards.length; i++) {
    const { name, boards, list, status, completed } = dashcards[i];

    const nameFormatted = name.trim().replace(/\s/g, "_"); // remplazar los espacios por guiones bajos y si tiene espacios al inicio o final quitarlos
    const cardsDashCards = [];

    console.log("---------------- |", name, "| ----------------");
    for (let j = 0; j < boards.length; j++) {
      const boardName = boards[j]; // boards es un array de strings con los nombres de los boards

      // Obtenemos el board de la lista de boards
      const board = listBoards.find(
        (list) =>
          list.name.trim().toUpperCase() === boardName.trim().toUpperCase()
        // list.name.tim().includes(board.name) // usar includes si el nombre del board no es exacto
      );
      if (!board || board.length === 0) {
        console.log(`No se encontro el board ${boardName} ❌`);
        continue;
      }

      console.log("Board: ", board.id, "->", board.name);
      // Obtenemos las cards del board
      let cardsAux = [];
      try {
        const rawCards = fs.readFileSync(`Consultas/${board.id}.json`, "utf8");
        cardsAux = JSON.parse(rawCards);
      } catch (error) {
        console.log(`Error al obtener las cards del board ${boardName} ❌`);
        continue;
      }

      // Obtenemos las listas de custom fields del board
      let statusField = {};
      let completedField = {};
      try {
        const rawCustomFields = fs.readFileSync(
          `Consultas/customFields_${board.id}.json`,
          "utf8"
        );
        const customFields = JSON.parse(rawCustomFields);

        let c = 0;
        for (const customField of customFields) {
          if (customField.name === "Status") {
            statusField = customField;
            c++;
            if (c === 2) break;
          } else if (customField.name === "Completed") {
            completedField = customField;
            c++;
            if (c === 2) break;
          }
        }
      } catch (error) {
        console.log(
          `Error al obtener los custom fields del board ${boardName} ❌`
        );
      }

      const cards = [];

      for (let k = 0; k < cardsAux.length; k++) {
        const card = cardsAux[k];
        card.board = board.name;

        // Validamos si la card esta en la list (categorias)
        if (!list.includes(card.categoria)) continue;

        // si status y completed estan vacios guardamos la card
        if (!status && !completed) {
          cards.push(card);
          continue;
        }

        // Obtenemos el customfielitems de la card
        const customFieldItems = await fetchCustomFieldItems(card.id);

        // Validamos el status de la card y lo guardamos
        if (!isEmpty(statusField) && status) {
          // 1. obtenemos del customFieldItems el status con el id del statusField
          const statusCustomFieldItem = customFieldItems.find((item) => {
            if (item.idCustomField === statusField.id) {
              return item;
            }
          });
          if (isEmpty(statusCustomFieldItem)) {
            console.log(
              `No se encontro el status de la card ${JSON.stringify(
                card,
                null,
                2
              )} ❌`
            );
            continue;
          }

          // 2. obtenemos el valor del status
          // console.log("card: " + JSON.stringify(card, null, 2));
          const {
            value: { text },
          } = statusField.options.find((option) => {
            if (option.id === statusCustomFieldItem.idValue) {
              return option;
            }
          });

          if (text.trim().toUpperCase() !== status.trim().toUpperCase())
            continue;

          card.status = text;
        }

        // Validamos el completed de la card y lo guardamos
        if (!isEmpty(completedField) && completed) {
          // del completedField usamos el id para encontrar el completed en customFieldItems y obtener la fecha
          const {
            value: { date },
          } = customFieldItems.find(
            (item) => item.idCustomField === completedField.id
          );

          // console.log("Completed: ", date); // fecha en formato ISO 8601: 2021-09-30T00:00:00.000Z
          const dateCompleted = new Date(date);
          const dateNow = new Date();

          if (completed === "this week") {
            const oneWeekAgo = new Date(dateNow);
            oneWeekAgo.setDate(dateNow.getDate() - 7);
            if (dateCompleted < oneWeekAgo) continue;

            card.completed = completed;
            card.completedDate = date;
          } else if (completed === "this month") {
            const oneMonthAgo = new Date(dateNow);
            oneMonthAgo.setMonth(dateNow.getMonth() - 1);
            if (dateCompleted < oneMonthAgo) continue;

            card.completed = completed;
            card.completedDate = date;
          }
        }

        cards.push(card);
      }
      console.log("Total de cards: ", cards.length);
      cardsDashCards.push(...cards);
    }
    // guardar los datos en un archivo
    guardarDatosEnArchivo(
      cardsDashCards,
      `${nameFormatted}.json`,
      "TaskBoardTracker"
    );
    return;
  }
}

const rawData = fs.readFileSync("Consultas/boards.json", "utf8");
const listBoards = JSON.parse(rawData);
getDateTaskBoardTracker(listBoards);

async function main() {
  let listBoards = await fetchBoardsOfOrganization(); // Obtenemos todos los boards de la organizacion
  const boardsUsadas = boardsUnicos(); // Obtenemos los boards que se usan en el "Task Board Tracker"

  // Filtramos listBoards para que solo contenga los boards que se usan en el "Task Board Tracker" y los guardamos en un archivo boards.json
  listBoards = listBoards.filter((board) => boardsUsadas.includes(board.name));
  guardarDatosEnArchivo(listBoards, "boards.json");

  // Iteramos sobre listBoards para obtener ListCards, Cards y ListCustomFields

  for (let i = 0; i < listBoards.length; i++) {
    const board = listBoards[i];

    const list = await fetchListsOfBoardMoreSave(board.id); // Obtenemos las listas del board y las guardamos en un archivo list_idBoard.json
    await Promise.all([
      fetchCardsOfBoardMoreSave(board.id, list), // Obtenemos las cards del board y las guardamos en un archivo idBoard.json
      fetchListCustomFieldMoreSave(board.id), // Obtenemos los custom fields del board y los guardamos en un archivo customFields_idBoard.json
    ]);
  }
}

// main();
