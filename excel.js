import { Parser } from "json2csv";
import fs from "fs";
import path, { delimiter } from "path";

// Configuración del parser
/**
 *
 * {
    "id": "",
    "name": "",
    "desc": "",
    "dateLastActivity": "",
    "closed": ,
    "manualCoverAttachment": ,
    "dueComplete": ,
    "idBoard": "",
    "idList": "",
    "categoria": "",
    "url": "",
    "shortUrl": "",
    "board": "",
    "dateCreate": ""
  }
 */

const fields = [
  "name",
  "board",
  "categoria",
  "dateCreate",
  "dateLastActivity",
  //   "closed",
  //   "manualCoverAttachment",
  //   "dueComplete",
  //   "idBoard",
  //   "idList",
  //   "url",
  "shortUrl",
  "status",
  "completed",
  "completedDate",
];
const opts = { fields, delimiter: ";" };

const folder = "TaskBoardTracker/";

// Leer todos los archivos de la carpeta
export function convertirJsonACsv() {
  fs.readdir(folder, (err, files) => {
    if (err) {
      return console.error("No se pudo leer la carpeta:", err);
    }

    // Filtrar solo los archivos .json
    const jsonFiles = files.filter((file) => path.extname(file) === ".json");

    jsonFiles.forEach((file) => {
      const filePath = path.join(folder, file);

      // Leer el contenido de cada archivo .json
      fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
          return console.error("No se pudo leer el archivo:", err);
        }
        const boardName = filePath.split("\\")[1].split(".")[0];
        try {
          const jsonData = JSON.parse(data); // sirve
          const dataFormatted = jsonData.map((item) => {
            return {
              name: item.name,
              board: item.boardName,
              categoria: item.categoria,
              dateCreate: item.dateCreate,
              dateLastActivity: item.dateLastActivity,
              // closed: item.closed,
              // manualCoverAttachment: item.manualCoverAttachment,
              // dueComplete: item.dueComplete,
              // idBoard: item.idBoard,
              // idList: item.idList,
              // url: item.url,
              shortUrl: item.shortUrl,
              status: item.status,
              completed: item.completed,
              completedDate: item.completedDate,
            };
          });

          const parser = new Parser(opts);
          const csv = parser.parse(dataFormatted);

          // Guardar el archivo CSV
          fs.writeFileSync(`Excel/${boardName}.csv`, csv);
          console.log("Archivo CSV creado exitosamente.");
        } catch (err) {
          console.error("Error al parsear el JSON:", err);
        }
      });
    });
  });
}
