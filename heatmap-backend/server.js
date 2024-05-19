const express = require("express");
const cors = require("cors");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const app = express();

app.use(cors());
app.use(express.json());

// Get the project directory
const projectDir = path.dirname(path.dirname(path.dirname(__filename)));

// Utility function to read CSV and filter based on selection
const readCSV = (filterColumn = null, filterValue = null) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const csvFilePath = path.join(
      projectDir,
      "Shadow",
      "heatmap-backend",
      "dataset",
      "merged_data_cleaned.csv"
    );
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => {
        if (!filterColumn || row[filterColumn] === filterValue) {
          results.push(row);
        }
      })
      .on("end", () => {
        resolve(results);
      })
      .on("error", reject);
  });
};

// Endpoint to get unique district names
app.get("/api/districts", async (req, res) => {
  try {
    const data = await readCSV();
    const districts = [...new Set(data.map((item) => item.district_name))];
    res.json(districts);
  } catch (error) {
    res.status(500).send("Error reading CSV file");
  }
});

// Endpoint to get unit names based on the selected district
app.get("/api/units/:district", async (req, res) => {
  try {
    const { district } = req.params;
    const data = await readCSV("district_name", district);
    const units = [...new Set(data.map((item) => item.unitname))];
    res.json(units);
  } catch (error) {
    res.status(500).send("Error reading CSV file");
  }
});

// New endpoint to get beat names based on the selected unit
app.get("/api/beats/:unit", async (req, res) => {
  try {
    const { unit } = req.params;
    const data = await readCSV("unitname", unit);
    const beats = [...new Set(data.map((item) => item.beat_name))];
    res.json(beats);
  } catch (error) {
    res.status(500).send("Error reading CSV file");
  }
});

// Endpoint to get data based on the selected beat
app.get("/api/data-by-beat/:beat", async (req, res) => {
  try {
    const { beat } = req.params;
    const data = await readCSV("beat_name", beat);
    res.json(data);
  } catch (error) {
    res.status(500).send("Error reading CSV file: " + error.message);
  }
});

app.get("/api/crime-by-time/:district/:unit", async (req, res) => {
  try {
    const { district, unit } = req.params;
    const data = await readCSV("district_name", district);
    const filteredData = data.filter(d => d.unitname === unit);
    const timeCounts = filteredData.reduce((acc, row) => {
      const time = row.Offence_From_Time_only;
      if (time) {
        const hour = time.split(':')[0];
        if (!acc[hour]) {
          acc[hour] = { count: 0, crimes: {} };
        }
        acc[hour].count++;
        const crimeType = row.Crime_Type || "Unknown";
        if (!acc[hour].crimes[crimeType]) {
          acc[hour].crimes[crimeType] = 0;
        }
        acc[hour].crimes[crimeType]++;
      }
      return acc;
    }, {});

    const sortedTimes = [];
    for (let i = 0; i < 24; i++) {
      const hourData = timeCounts[i] || { count: 0, crimes: {} };
      const topCrimes = Object.entries(hourData.crimes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(item => `${item[0]} (${item[1]})`);
      sortedTimes.push({
        hour: `${i}:00`,
        count: hourData.count,
        topCrimes: topCrimes.length ? topCrimes.join(", ") : "No data"
      });
    }

    res.json(sortedTimes);
  } catch (error) {
    res.status(500).send("Error processing data by time: " + error.message);
  }
});

app.get("/api/crime-by-month/:district/:unit", async (req, res) => {
  const { district, unit } = req.params;
  const data = await readCSV("district_name", district);
  const filteredData = data.filter(d => d.unitname === unit);

  const monthCounts = filteredData.reduce((acc, row) => {
    const month = row.Offence_From_Date_only.split('-')[1]; // Assumes YYYY-MM-DD format
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const sortedMonths = Object.keys(monthCounts).map(month => ({
    month,
    count: monthCounts[month]
  })).sort((a, b) => a.month - b.month); // Ensure the months are ordered

  res.json(sortedMonths);
});

app.get("/api/crime-by-week/:district/:unit", async (req, res) => {
  const { district, unit } = req.params;
  const data = await readCSV("district_name", district);
  const filteredData = data.filter(d => d.unitname === unit);

  const weekCounts = filteredData.reduce((acc, row) => {
    const date = new Date(row.Offence_From_Date_only);
    const week = getWeekNumber(date); // Function to calculate week number
    acc[week] = (acc[week] || 0) + 1;
    return acc;
  }, {});

  const sortedWeeks = Object.keys(weekCounts).map(week => ({
    week,
    count: weekCounts[week]
  })).sort((a, b) => a.week - b.week); // Ensure the weeks are ordered

  res.json(sortedWeeks);
});

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
}

app.post("/api/details", async (req, res) => {
  try {
    const { district, unit, startMonth, endMonth } = req.body;
    const data = await readCSV();

    // Filter data based on provided district, unit, and month range
    const filteredData = data.filter(
      (row) =>
        (row.district_name === district || !row.district_name) &&
        (row.unitname === unit || !row.unitname) &&
        (parseInt(row.Offence_From_Date_only.split('-')[1]) >= startMonth && parseInt(row.Offence_From_Date_only.split('-')[1]) <= endMonth)
    );

    // Helper function to calculate top occurrences
    const getTopOccurrences = (data, key, count = 10) => {
      const frequency = {};
      data.forEach((item) => {
        const value = item[key];
        if (value && value.trim() !== "" && !/^[-,\s]*$/.test(value)) {
          if (!frequency[value]) {
            frequency[value] = 0;
          }
          frequency[value] += 1;
        }
      });
      return Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([value, freq]) => ({ value, freq }));
    };

    // Get top occurrences for summary
    const topLatLong = getTopOccurrences(filteredData, "latitude").map(
      (lat) => ({
        latitude: lat.value,
        longitude: getTopOccurrences(
          filteredData.filter(
            (item) => item.latitude === lat.value && item.longitude
          ),
          "longitude"
        )[0]?.value,
        crimeType: getTopOccurrences(
          filteredData.filter(
            (item) => item.latitude === lat.value && item.longitude
          ),
          "Crime_Type"
        )[0]?.value,
      })
    );

    const topCrimeGroups = getTopOccurrences(filteredData, "crime_group_name");
    const topCrimes = getTopOccurrences(filteredData, "Crime_Type");
    const topMonths = getTopOccurrences(filteredData, "month");

    const details = {
      topLatLong,
      topCrimeGroups,
      topCrimes,
      topMonths,
    };

    res.json({ details, allData: filteredData });
  } catch (error) {
    console.error("Error fetching details:", error);
    res.status(500).send("Error fetching details from CSV");
  }
});


// Endpoint to process data and return frequency of each value for every field
app.post("/api/data-frequency", async (req, res) => {
  try {
    const { selectedDistrict, selectedUnit } = req.body;
    const data = await readCSV();

    const filteredData = data.filter(
      (row) =>
        (!selectedDistrict || row.district_name === selectedDistrict) &&
        (!selectedUnit || row.unitname === selectedUnit)
    );

    let frequency = {};
    filteredData.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (!frequency[key]) {
          frequency[key] = {};
        }
        if (!frequency[key][row[key]]) {
          frequency[key][row[key]] = 0;
        }
        frequency[key][row[key]] += 1;
      });
    });

    res.json(frequency);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
