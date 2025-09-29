import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.API_KEY;
const token = process.env.TOKEN;

const idOrganizaations = "64a86c7ab6a58bf68c0f86d6";

const url = `https://api.trello.com/1/organizations/${idOrganizaations}/boards?key=${apiKey}&token=${token}`;

async function fetchAndSaveData() {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
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

    fs.writeFileSync("boards.json", JSON.stringify(dataFormatted, null, 2));
    console.log("Data saved to 'boards.json'");
  } catch (err) {
    console.error(err);
  }
}

fetchAndSaveData();
