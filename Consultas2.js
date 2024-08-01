import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import { dashcards } from "./TaskBoardTracker.js";

dotenv.config();
/**
 Hay un límite de 300 solicitudes cada 10 segundos para cada clave API y no más de 100 solicitudes por intervalo de 10 segundos para cada token. Si una solicitud excede el límite, Trello devolverá un error 429.
 */
const apiKey = process.env.API_KEY;
const tokens = [process.env.TOKEN, process.env.TOKEN2, process.env.TOKEN3];
const idOrganizations = process.env.ID_ORGANIZATIONS;

const delay = 10000; // 10 segundos en milisegundos
const chunkSize = 50; // Máximo de 100 solicitudes concurrentes, pero como se hacen 2 solicitudes por tarjeta, se reduce a 50

/**
 * Obtiene los boards de la organización
 * @returns {Promise<Array>} Retorna un array con los boards de la organizacion
 */
export async function getBoardsOfOrganization() {
  const boards = await axios.get(
    `https://api.trello.com/1/organizations/${idOrganizations}/boards`,
    {
      params: {
        key: apiKey,
        token: tokens[0],
      },
    }
  );

  const dataFormatted = [];
  boards.data.forEach((board) => {
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

  return dataFormatted;
}

/**
 * Obtiene las listas y los campos personalizados de los boards
 * @param {array} boards Array con los boards de la organización
 * @returns {Promise<{lists: Object, customFields: Object}>} Retorna un objeto con las listas y los campos personalizados de los boards
 */
async function getListAndCustomFieldsForBoards(boards) {
  const lists = {};
  const customFields = {};

  let tokenIndex = 0;

  for (let i = 0; i < boards.length; i += chunkSize) {
    const chunk = boards.slice(i, i + chunkSize);
    const requests = chunk.map((board) => {
      const customFieldsRequest = axios.get(
        `https://api.trello.com/1/boards/${board.id}/customFields`,
        {
          params: {
            filter: "all",
            key: apiKey,
            token: tokens[tokenIndex],
          },
        }
      );
      const listRequest = axios.get(
        `https://api.trello.com/1/boards/${board.id}/lists`,
        {
          params: {
            key: apiKey,
            token: tokens[tokenIndex],
          },
        }
      );

      // Cambiar al siguiente token para la siguiente solicitud
      tokenIndex = (tokenIndex + 1) % tokens.length;

      return Promise.all([customFieldsRequest, listRequest])
        .then(([customFieldsResponse, listResponse]) => {
          customFields[board.id] = customFieldsResponse.data;
          lists[board.id] = listResponse.data;
        })
        .catch((error) => {
          console.error(`Error fetching data for board ${board.id}:`, error);
        });
    });

    // Esperar a que todas las solicitudes en el bloque se completen
    await Promise.all(requests);

    // Esperar 10 segundos antes de continuar con el siguiente bloque si hay más solicitudes
    if (i + chunkSize < boards.length && tokenIndex === 0) {
      console.log(
        "Esperando 10 segundos para no exceder el límite de la API..."
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return { lists, customFields };
}

/**
 * Obtiene las listas y los campos personalizados de los boards y los guarda en un archivo lists.json y customFields.json
 * @param {Array} boards Array con los boards
 * @returns {Promise<{lists: Object, customFields: Object}>} Retorna un objeto con las listas y los campos personalizados de los boards
 */
async function getListAndCustomFieldsForBoardsAndSave(boards) {
  const { lists, customFields } = await getListAndCustomFieldsForBoards(boards);
  guardarDatosEnArchivoJSON(lists, "lists.json");
  guardarDatosEnArchivoJSON(customFields, "customFields.json");
  return { lists, customFields };
}

/**
 * Obtiene las tarjetas de un board
 * @param {string} boardId
 * @returns {Promise<Array>} Retorna un array con las tarjetas del board
 */
async function getCardsOfBoard(boardId) {
  const cards = await axios.get(
    `https://api.trello.com/1/boards/${boardId}/cards`,
    {
      params: {
        key: apiKey,
        token: tokens[0],
      },
    }
  );
  const dataFormatted = [];

  cards.data.forEach((card) => {
    if (card.closed || card.manualCoverAttachment) return; // si esta cerrado o tiene una imagen de portada no lo guardamos
    // ? card.manualCoverAttachment: Si la tarjeta tiene una imagen de portada, no debería ser considerada en ningun caso?
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
      url: card.url,
      shortUrl: card.shortUrl,
    });
  });

  return dataFormatted;
}

/**
 * Obtiene las acciones y los campos personalizados de las tarjetas de un board
 * @param {array} cards Array con las tarjetas de un board
 * @returns {Promise<Object>} Retorna un objeto con las tarjetas y sus acciones y campos personalizados
 */
async function getActionsAndCustomFieldsItemsForCards(cards) {
  const cardData = {};

  // Límite de solicitudes por intervalo de 10 segundos
  let tokenIndex = 0;

  for (let i = 0; i < cards.length; i += chunkSize) {
    const chunk = cards.slice(i, i + chunkSize);
    const requests = chunk.map((card) => {
      const actionsRequest = axios.get(
        `https://api.trello.com/1/cards/${card.id}/actions`,
        {
          params: {
            filter: "all",
            key: apiKey,
            token: tokens[tokenIndex],
          },
        }
      );

      const customFieldsRequest = axios.get(
        `https://api.trello.com/1/cards/${card.id}/customFieldItems`,
        {
          params: {
            key: apiKey,
            token: tokens[tokenIndex],
          },
        }
      );

      // Cambiar al siguiente token para la siguiente solicitud
      tokenIndex = (tokenIndex + 1) % tokens.length;

      return Promise.all([actionsRequest, customFieldsRequest])
        .then(([actionsResponse, customFieldsResponse]) => {
          cardData[card.id] = {
            ...card,
            customFieldItems: customFieldsResponse.data,
            actions: actionsResponse.data,
          };
        })
        .catch((error) => {
          console.error(`Error fetching data for card ${card.id}:`, error);
        });
    });

    // Esperar a que todas las solicitudes en el bloque se completen
    await Promise.all(requests);

    // Esperar 10 segundos antes de continuar con el siguiente bloque si hay más solicitudes
    if (i + chunkSize < cards.length && tokenIndex === 0) {
      console.log(
        "Esperando 10 segundos para no exceder el límite de la API..."
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.log("Data processed ✅");
  return cardData;
}

/**
 * Obtiene las listas y los campos personalizados de los boards que se usan en el "Task Board Tracker" y los guarda en un archivo .json
 * @param {Array} cards Array con las tarjetas de un board
 * @param {String} nombreArchivo Nombre del archivo donde se guardarán los datos
 * @returns {Promise<Object>} Retorna un objeto con las tarjetas y sus acciones y campos personalizados
 */
async function getActionsAndCustomFieldsItemsForCardsAndSave(
  cards,
  nombreArchivo
) {
  const cardData = await getActionsAndCustomFieldsItemsForCards(cards);
  guardarDatosEnArchivoJSON(cardData, `${nombreArchivo}.json`);
  return cardData;
}

/**
 * Guarda los datos en un archivo JSON
 * @param {Object|Array} data Datos a guardar en el archivo, puede ser un objeto o un array
 * @param {string} nombreArchivo Nombre del archivo
 * @param {string} carpeta Carpeta donde se guardará el archivo
 */
export function guardarDatosEnArchivoJSON(
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

/**
 * Obtiene los name boards únicos que se usan en el "Task Board Tracker"
 * @returns {Array} Retorna un array con los name boards únicos que se usan en el "Task Board Tracker"
 */
function nameBoardsUnicos() {
  const allBoards = dashcards
    .map((dashcard) => dashcard.boards) // Obtenemos los boards de cada dashcard
    .flat() // Convertimos el array de arrays en un solo array
    .filter((board, index, array) => array.indexOf(board) === index); // Filtramos los boards para que solo contenga uno de cada uno

  return allBoards;
}

/**
 * Obtiene los boards que se usan en el "Task Board Tracker"
 * @returns {Promise<Array>} Retorna un array con los boards que se usan en el "Task Board Tracker"
 */
async function getBoardsOfTaskBoardTracker() {
  const boardsOfTaskBoardTracker = nameBoardsUnicos();

  const allBoards = await getBoardsOfOrganization();

  const boards = allBoards.filter((board) =>
    boardsOfTaskBoardTracker.includes(board.name)
  );
  return boards;
}

/**
 * Obtiene los boards que se usan en el "Task Board Tracker" y los guarda en un archivo boards.json
 * @returns {Promise<Array>} Retorna un array con los boards que se usan en el "Task Board Tracker"
 */
async function getBoardsOfTaskBoardTrackerAndSave() {
  const boards = await getBoardsOfTaskBoardTracker();
  guardarDatosEnArchivoJSON(boards, "boards.json");
  return boards;
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

// getActionsAndCustomFieldsItemsForCards(cards)
//   .then((cardData) => {
//     try {
//       fs.writeFileSync("prueba.json", JSON.stringify(cardData, null, 2));
//       console.log(
//         "Datos de las tarjetas procesados y guardados en prueba.json"
//       );
//     } catch (error) {
//       console.error("Error procesando datos de las tarjetas:", error);
//     }
//   })
//   .catch((error) => {
//     console.error("Error obteniendo datos de las tarjetas:", error);
//   });

async function main() {
  // Obtenemos todos los boards de la organización
  const boards = await getBoardsOfTaskBoardTrackerAndSave();
  // Obtenemos las listas y los campos personalizados de los boards
  const { lists, customFields } = await getListAndCustomFieldsForBoardsAndSave(
    boards
  );
  // For a boards, para obtener las tarjetas de cada uno. Luego, para cada tarjeta, obtener las acciones y los campos personalizados y guardarlos en un archivo
  for (let i = 0; i < boards.length; i++) {
    const { id } = boards[i];
    const cards = await getCardsOfBoard(id);
    if (i + 1 < boards.length) {
      console.log(
        "Esperando 10 segundos para no exceder el límite de la API..."
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    await getActionsAndCustomFieldsItemsForCardsAndSave(cards, id);
  }
}

/**
 * Obtiene los boards, las listas y los campos personalizados de los boards de los archivos boards.json, lists.json y customFields.json de la carpeta Consultas
 * @returns {Promise<{boards: Array, lists: Object, customFields: Object}>} Retorna un objeto con los boards, las listas y los campos personalizados de los boards
 */
function getBoardAndCustomFieldsAndLists() {
  let boards = [];
  let lists = {};
  let customFields = {};
  try {
    const rawData = fs.readFileSync("Consultas/boards.json", "utf8");
    boards = JSON.parse(rawData);

    const rawDataLists = fs.readFileSync("Consultas/lists.json", "utf8");
    lists = JSON.parse(rawDataLists);

    const rawDataCustomFields = fs.readFileSync(
      "Consultas/customFields.json",
      "utf8"
    );
    customFields = JSON.parse(rawDataCustomFields);
  } catch (error) {
    console.error("Error obteniendo los datos:", error);
  }
  return { boards, lists, customFields };
}

function getDataOfActionsOfCard(card) {
  const result = { dateCreate: "" };
  if (isEmpty(card)) return result;
  const { actions } = card;
  if (isEmpty(actions)) return result;

  // Obtener fecha de creación. En los actions esta el type: "createCard", pero no siempre esta este action, por lo que se obtiene la fecha de la primera acción que se haya realizado en la tarjeta
  const createCardAction = actions.find(
    (action) => action.type === "createCard"
  );

  if (!isEmpty(createCardAction)) {
    result.dateCreate = createCardAction.date;
  } else {
    actions.sort((a, b) => new Date(a.date) - new Date(b.date));
    const firstAction = actions[0];
    if (!isEmpty(firstAction)) result.dateCreate = firstAction.date;
  }

  return result;
}

function getDataOfCustomFieldsItemsOfCard() {}

function getCategoriaOfCard(card, listBoard) {
  if (isEmpty(listBoard)) return "";
  const { name } = listBoard.find((list) => list.id === card.idList);

  return name;
}

function getStatusAndCompletedOfCustomField(customField) {
  let statusField = {};
  let completedField = {};
  if (isEmpty(customField)) return { statusField, completedField };

  let c = 0;
  for (const customFieldItem of customField) {
    const { id, value } = customFieldItem;
    if (id === "status") {
      statusField = customFieldItem;
      c++;
      if (c === 2) break;
    } else if (id === "completed") {
      completedField = customFieldItem;
      c++;
      if (c === 2) break;
    }
  }

  return { statusField, completedField };
}

function getStatusOfCard(cardId, status, customFieldItems, statusField) {
  const statusCard = customFieldItems.find(
    (item) => item.idCustomField === statusField.id
  );
  if (isEmpty(statusCard)) {
    console.log(
      `No se encontró el campo personalizado status en la tarjeta ${cardId}`
    );
    return "";
  }

  const statusOption = statusField.options.find((option) => {
    return option.id === statusCard.idValue;
  });

  if (isEmpty(statusOption)) {
    console.log(
      `No se encontró la opción del campo personalizado status en la tarjeta ${cardId}`
    );
    return "";
  }

  const statusCardName = statusOption?.value?.text;
  if (isEmpty(statusCardName)) {
    console.log(
      `No se encontró el text de la opción del campo personalizado status en la tarjeta ${cardId}`
    );
    return "";
  }

  if (text.trim().toUpperCase() !== status.trim().toUpperCase()) return "";

  return statusCardName;
}

function getCompletedOfCard(
  cardId,
  completed,
  customFieldItems,
  completedField
) {
  const result = { completed: "", completedDate: "" };

  const customFieldItem = customFieldItems.find(
    (item) => item.idCustomField === completedField.id
  );
  if (isEmpty(customFieldItem)) {
    console.log(
      `No se encontró el campo personalizado completed en la tarjeta ${cardId}`
    );
    return result;
  }
  const completedCard = customFieldItem?.value?.date;

  if (isEmpty(completedCard)) {
    console.log(
      `No se encontró la fecha del campo personalizado completed en la tarjeta ${cardId}`
    );
    return result;
  }

  const dateCompleted = new Date(date);
  const dateNow = new Date();
  if (completed === "this week") {
    const oneWeekAgo = new Date(dateNow);
    oneWeekAgo.setDate(dateNow.getDate() - 7);
    if (dateCompleted < oneWeekAgo) return result;

    result.completed = completed;
    result.completedDate = date;
  } else if (completed === "this month") {
    const oneMonthAgo = new Date(dateNow);
    oneMonthAgo.setMonth(dateNow.getMonth() - 1);
    if (dateCompleted < oneMonthAgo) return result;

    result.completed = completed;
    result.completedDate = date;
  }
  return result;
}

function extraerCardDeTaskBoardTracker() {
  const { boards, lists, customFields } = getBoardAndCustomFieldsAndLists();

  for (const dashcard of dashcards) {
    const { name, boards, list, status, completed } = dashcard;

    const nameFormatted = name.trim().replace(/\s/g, "_"); // remplazar los espacios por guiones bajos y si tiene espacios al inicio o final quitarlos
    const cardsDashCards = [];

    for (const boardName of boards) {
      const board = boards.find((board) => board.name === boardName);
      if (isEmpty(board)) {
        console.log(`No se encontró el board ${boardName}`);
        continue;
      }

      // Obtener las tarjetas del board
      let cards = [];
      try {
        const rawData = fs.readFileSync(`Consultas/${board.id}.json`, "utf8");
        cards = JSON.parse(rawData);
      } catch (error) {
        console.error(
          `Error obteniendo las tarjetas del board ${boardName}:`,
          error
        );
        continue;
      }

      const listBoard = lists[board.id];
      const customField = customFields[board.id];

      const { statusField, completedField } =
        getStatusAndCompletedOfCustomField(customField);

      const cardsDashCards = [];

      for (const card of cards) {
        card.categoria = getCategoriaOfCard(card, listBoard);
        card = { ...card, ...getDataOfActionsOfCard(card) };

        // Validamos si la card esta en la list (categorias)
        if (!list.includes(card.categoria)) continue;

        // Si no hay status ni completed en la dashcard, se agrega la card
        if (isEmpty(status) && isEmpty(completed)) {
          cardsDashCards.push(card);
          continue;
        }

        // Validamos el status de la card y lo guardamos
        const { customFieldItems } = card;
        if (
          !isEmpty(statusField) &&
          !isEmpty(customFieldItems) &&
          !isEmpty(status)
        ) {
          const statusCard = getStatusOfCard(
            card.id,
            status,
            customFieldItems,
            statusField
          );
          if (isEmpty(statusCard)) continue;

          card.status = statusCard;
        }

        // Validamos el completed de la card y lo guardamos
        if (!isEmpty(completedField) && !isEmpty(completed)) {
          const completedCard = getCompletedOfCard(
            card.id,
            completed,
            customFieldItems,
            completedField
          );
          if (isEmpty(completedCard.completed)) continue;

          card.completed = completedCard.completed;
          card.completedDate = completedCard.completedDate;
        }

        // const {
        //   id,
        //   name,
        //   desc,
        //   dateLastActivity,
        //   closed,
        //   manualCoverAttachment,
        //   dueComplete,
        //   idBoard,
        //   idList,
        //   url,
        //   shortUrl,
        //   customFieldItems,
        //   actions,
        // } = card;

        // const cardFormatted = {
        //   id,
        //   name,
        //   desc,
        //   dateLastActivity,
        //   closed,
        //   manualCoverAttachment,
        //   dueComplete,
        //   idBoard,
        //   idList,
        //   url,
        //   shortUrl,
        //   customFieldItems,
        //   actions,
        // };

        cardsDashCards.push(card);
      }
    }

    guardarDatosEnArchivoJSON(
      cardsDashCards,
      `${nameFormatted}.json`,
      "TaskBoardTracker"
    );
  }
}

extraerCardDeTaskBoardTracker();
