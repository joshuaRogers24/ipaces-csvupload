import { google } from 'googleapis';
import { Storage } from '@google-cloud/storage';
import * as functions from 'firebase-functions';

const sheets = google.sheets('v4');

export const csv2sheet = async (file: { bucket: string; name: string }, _ctx) => {
  const fileName = file.name;
  // basic check that this is a *.csv file, etc...
  if (!fileName.endsWith('.csv')) {
    console.log('Not a .csv file, ignoring.');
    return;
  }
  // define name of new sheet
  const sheetName = fileName.slice(0, -4);

  // create a new sheet and remember its ID (based on the filename, removing the .csv extension)
  const sheetId = await addEmptySheet(sheetName);
  const theData = await readCSVContent(file.bucket, file.name);
  if (sheetId !== null && theData !== null) {
    await updateSheetWithFileData(theData);
  }
};

// Creates a new sheet in the spreadsheet
async function addEmptySheet(sheetName: string): Promise<number> {
  const requestBody = {
    properties: {
      title: sheetName,
    },
  };

  const res = (
    await sheets.spreadsheets.create({
      requestBody,
      fields: 'spreadsheetId',
    })
  ).data;

  return 24;
}

export const csvToSheetTest = async () => {
  await readCSVContent('csv2sheet-ipaces_test', 'Game Data Definitions - Sheet1.csv');
};

/**
 * Reads data from a the CSV file uploaded to a Google storage bucket
 * and returns a string of CSV values with carriage returns
 *
 * @param fileBucket indicates which bucket the CSV file is in
 * @param fileName name of the csv file
 * @returns the content of the csv file
 */
async function readCSVContent(fileBucket: string, fileName: string): Promise<string> {
  const storage = new Storage();
  let fileContents = Buffer.from('');

  return new Promise((resolve, reject) => {
    storage
      .bucket(fileBucket)
      .file(fileName)
      .createReadStream()
      .on('error', function (error) {
        reject(error);
      })
      .on('data', function (chunk) {
        fileContents = Buffer.concat([fileContents, chunk]);
      })
      .on('end', function () {
        const content = fileContents.toString('utf8');
        functions.logger.info('The contents of thr CSV', content);
        resolve(content);
      });
  });
}

/**
 * Replace the data in the given sheet with new data
 */
async function updateSheetWithFileData(data: string) {
  const sheetTitle = 'Pizza';

  const body = {
    values: [
      ['test', 1],
      ['test', 2],
    ],
  };

  const updateRequest = {
    spreadsheetId: process.env.SPREADSHEET_ID || '',
    range: `${sheetTitle}!A:B`,
    valueInputOption: 'USER_ENTERED',
    requestBody: body,
  };

  try {
    await sheets.spreadsheets.values.update(updateRequest);
    functions.logger.info();
  } catch (error) {
    functions.logger.error('The Sheets API returned an error', error);
  }
}
