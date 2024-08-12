import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import readline from "readline";
import { dashcards } from "./TaskBoardTracker.js";
import { dashcards as dashcardsPs } from "./TaskBoardPS.js";
import { convertirJsonACsv } from "./excel.js";

dotenv.config();
/**
 Hay un límite de 300 solicitudes cada 10 segundos para cada clave API y no más de 100 solicitudes por intervalo de 10 segundos para cada token. Si una solicitud excede el límite, Trello devolverá un error 429.
 */
const apiKey = process.env.API_KEY;
const tokens = [process.env.TOKEN, process.env.TOKEN2, process.env.TOKEN3];
const idOrganizations = process.env.ID_ORGANIZATIONS;

const delay = 10000; // 10 segundos en milisegundos
const chunkSize = 50; // Máximo de 100 solicitudes concurrentes, pero como se hacen 2 solicitudes por tarjeta, se reduce a 50
let tokenIndex = 0; // Límite de solicitudes por intervalo de 10 segundos

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
        token: tokens[tokenIndex],
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

  tokenIndex = (tokenIndex + 1) % tokens.length;
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
  const url = `https://api.trello.com/1/boards/${boardId}/cards`;
  tokenIndex = (tokenIndex + 1) % tokens.length;
  if (tokenIndex === 0) {
    console.log("Esperando 10 segundos para no exceder el límite de la API...");
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  const params = {
    key: apiKey,
    token: tokens[tokenIndex],
  };
  const cardsResponse = await fetchWithRetry(url, params);

  const dataFormatted = [];

  cardsResponse.data.forEach((card) => {
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
const retries = 11;
async function fetchWithRetry(url, params) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, { params });
      return response;
    } catch (error) {
      if (
        error.response &&
        error.response.status === 429 &&
        attempt < retries
      ) {
        console.warn(`Request rate-limited. Retrying attempt ${attempt}...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        throw error;
      }
    }
  }
}

/**
 * Obtiene las acciones y los campos personalizados de las tarjetas de un board
 * @param {array} cards Array con las tarjetas de un board
 * @returns {Promise<Object>} Retorna un objeto con las tarjetas y sus acciones y campos personalizados
 */
async function getActionsAndCustomFieldsItemsForCards(cards) {
  const cardData = {};

  tokenIndex = (tokenIndex + 1) % tokens.length;
  if (tokenIndex === 0) {
    console.log("Esperando 10 segundos para no exceder el límite de la API...");
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  for (let i = 0; i < cards.length; i += chunkSize) {
    const chunk = cards.slice(i, i + chunkSize);
    const requests = chunk.map((card) => {
      const actionsRequest = fetchWithRetry(
        `https://api.trello.com/1/cards/${card.id}/actions`,
        {
          filter: "all",
          key: apiKey,
          token: tokens[tokenIndex],
        }
      );

      const customFieldsRequest = fetchWithRetry(
        `https://api.trello.com/1/cards/${card.id}/customFieldItems`,
        {
          key: apiKey,
          token: tokens[tokenIndex],
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
function isEmpty(value) {
  // Verificar si el valor es null o undefined
  if (value == null) return true;

  // Verificar si el valor es un arreglo
  if (Array.isArray(value)) return value.length === 0;

  // Verificar si el valor es una cadena vacía
  if (typeof value === "string") return value.trim().length === 0;

  // Verificar si el valor es un objeto
  if (typeof value === "object") {
    // Verificar si el valor es un Map vacío
    if (value instanceof Map) return value.size === 0;

    // Verificar si el valor es un Set vacío
    if (value instanceof Set) return value.size === 0;

    // Verificar si el objeto no tiene propiedades
    return Object.keys(value).length === 0;
  }

  // Para otros tipos, considerar no vacío
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
    await getActionsAndCustomFieldsItemsForCardsAndSave(cards, id);
  }

  extraerCardDeTaskBoardTracker();
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

  // console.log(`customField: ${JSON.stringify(customField, null, 2)}`);

  let c = 0;
  for (const customFieldItem of customField) {
    const { name } = customFieldItem;
    if (name === "Status") {
      statusField = customFieldItem;
      c++;
      if (c === 2) break;
    } else if (name === "Completed") {
      completedField = customFieldItem;
      c++;
      if (c === 2) break;
    } else if (name === "Date Completed") {
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
    // console.log(
    //   `No se encontró el campo personalizado status en la tarjeta ${cardId}`
    // );
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

  if (statusCardName.trim().toUpperCase() !== status.trim().toUpperCase())
    return "";

  return statusCardName;
}

function isDateInThisMonth(date) {
  const now = new Date();
  const inputDate = new Date(date);

  return (
    now.getFullYear() === inputDate.getFullYear() &&
    now.getMonth() === inputDate.getMonth()
  );
}

function isDateInThisWeek(date) {
  const now = new Date();
  const inputDate = new Date(date);

  // Le quitamos la hora a la fecha actual
  now.setHours(0, 0, 0, 0);

  // Obtener el primer día de la semana (lunes)
  const firstDayOfWeek = new Date(
    now.setDate(now.getDate() - now.getDay() + 1)
  );
  // console.log("🚀 ~ isDateInThisWeek ~ firstDayOfWeek:", firstDayOfWeek);

  // Obtener el último día de la semana (domingo)
  const lastDayOfWeek = new Date(firstDayOfWeek);
  lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
  // le ponemos que la hora sea 23:59:59
  lastDayOfWeek.setHours(23, 59, 59, 999);

  // Verificar si la fecha de entrada está dentro de la semana
  return inputDate >= firstDayOfWeek && inputDate <= lastDayOfWeek;
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
    // console.log(
    //   `No se encontró el campo personalizado completed en la tarjeta ${cardId}`
    // );
    return result;
  }
  const date = customFieldItem?.value?.date;

  if (isEmpty(date)) {
    console.log(
      `No se encontró la fecha del campo personalizado completed en la tarjeta ${cardId}`
    );
    return result;
  }

  if (completed === "this week") {
    // const oneWeekAgo = new Date(dateNow);
    // oneWeekAgo.setDate(dateNow.getDate() - 7);
    // if (dateCompleted < oneWeekAgo) return result;
    if (!isDateInThisWeek(date)) return result;

    result.completed = completed;
    result.completedDate = date;
  } else if (completed === "this month") {
    // const oneMonthAgo = new Date(dateNow);
    // oneMonthAgo.setMonth(dateNow.getMonth() - 1);
    // if (dateCompleted < oneMonthAgo) return result;
    if (!isDateInThisMonth(date)) return result;

    result.completed = completed;
    result.completedDate = date;
  }
  return result;
}

function extraerCardDeTaskBoardTracker() {
  const { boards, lists, customFields } = getBoardAndCustomFieldsAndLists();

  // const empieza = dashcards.length - 1;
  // for (let i = empieza; i < dashcards.length; i++) {
  for (const dashcard of dashcards) {
    // const { name, boards: boardsName, list, status, completed } = dashcards[i];
    const { name, boards: boardsName, list, status, completed } = dashcard;

    const nameFormatted = name.trim().replace(/\s/g, "_"); // remplazar los espacios por guiones bajos y si tiene espacios al inicio o final quitarlos
    const cardsDashCards = [];
    // console.log(`Procesando la dashcard ${name} ✅`);

    // console.log(boardsName.length);
    for (const boardName of boardsName) {
      const board = boards.find((board) => board.name === boardName);
      if (isEmpty(board)) {
        console.log(`No se encontró el board ${boardName} ❌`);
        continue;
      }

      // Obtener las tarjetas del board
      let cards = {};
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
      // console.log("🚀 ~ customField:", customField);

      // const tamaño = Object.keys(cards).length;
      // console.log(
      //   `Procesando el board ${boardName} ✅ con ${tamaño} tarjetas >> id: ${board.id}`
      // );

      const { statusField, completedField } =
        getStatusAndCompletedOfCustomField(customField);

      for (const key in cards) {
        let card = cards[key];
        card.board = boardName;
        card.categoria = getCategoriaOfCard(card, listBoard);
        // console.log(`categoria (${card.categoria})`);
        card = { ...card, ...getDataOfActionsOfCard(card) };
        // Formatear la card para obtener solo los datos necesarios
        const { name, categoria, dateCreate, dateLastActivity, shortUrl } =
          card;
        let cardFormatted = {
          name,
          boardName,
          categoria,
          dateCreate: formatDateToYYYYMMDD(dateCreate),
          dateLastActivity: formatDateToYYYYMMDD(dateLastActivity),
          shortUrl,
        };

        // Validamos si la card esta en la list (categorias)
        if (!list.includes(card.categoria)) {
          continue;
        }

        // Si no hay status ni completed en la dashcard, se agrega la card
        if (!status && !completed) {
          cardsDashCards.push(cardFormatted);
          continue;
        }

        // Validamos si la card tiene customFieldItems para poder validar el status y el completed
        const { customFieldItems } = card;
        if (isEmpty(customFieldItems)) {
          // console.log(
          //   `No se puede validar el status y el completed en el board ${boardName} porque no se encontraron los customFieldItems de la tarjeta ${card.id} ❌`
          // );
          continue;
        }

        if (status) {
          if (isEmpty(statusField)) {
            // console.log(
            //   `No se puede validar el status en el board ${boardName} porque no se encontró el campo personalizado status ❌`
            // );
            continue;
          }
          // Validamos el status de la card y lo guardamos
          const statusCard = getStatusOfCard(
            card.id,
            status,
            customFieldItems,
            statusField
          );
          if (!statusCard) continue;

          card.statusName = statusCard;
        }

        if (completed) {
          if (isEmpty(completedField)) {
            // console.log(
            //   `No se puede validar el completed en el board ${boardName} porque no se encontró el campo personalizado completed ❌`
            // );
            continue;
          }
          // Validamos el completed de la card y lo guardamos
          const completedCard = getCompletedOfCard(
            card.id,
            completed,
            customFieldItems,
            completedField
          );
          if (isEmpty(completedCard.completed)) continue;

          card.completedName = completedCard.completed;
          card.completedDate = completedCard.completedDate;
        }

        // Formatear la card para obtener solo los datos necesarios
        const { statusName, completedName, completedDate } = card;

        cardFormatted = {
          ...cardFormatted,
          status: statusName,
          completed: completedName,
          completedDate: completedDate && formatDateToYYYYMMDD(completedDate),
        };

        cardsDashCards.push(cardFormatted);
      }
    }
    console.log(`El Board ${name} tiene ${cardsDashCards.length} tarjetas`);
    guardarDatosEnArchivoJSON(
      cardsDashCards,
      `${nameFormatted}.json`,
      "TaskBoardTracker"
    );
  }
}

function formatDateToYYYYMMDD(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Los meses van de 0 a 11, así que añadimos 1
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// interfaz de readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question(
  "¿Ya tienes todos los datos de los boards, listas, cards y custom fields? Se encuentran en la carpeta Consultas (s/n) ",
  async (answer) => {
    if (answer === "s") {
      extraerCardDeTaskBoardTracker();
    } else {
      await main();
    }
    convertirJsonACsv();
    rl.close();
  }
);
