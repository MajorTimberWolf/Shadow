import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Bar, Pie } from "react-chartjs-2";
import "chart.js/auto";
import pinIconUrl from "./marker.png"; // Make sure to provide the correct path
import { ProgressBar } from "react-loader-spinner";

const pinIcon = new L.Icon({
  iconUrl: pinIconUrl,
  iconSize: [35, 35], // Adjust size as needed
  iconAnchor: [17, 35], // Ensures the pin points exactly to the location
  popupAnchor: [0, -35], // Adjust based on your tooltip needs
});

const BeatWiseAnalysis = () => {
  const [districts, setDistricts] = useState([]);
  const [units, setUnits] = useState([]);
  const [beats, setBeats] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedBeat, setSelectedBeat] = useState("");
  const [chartData, setChartData] = useState([]);
  const [collapsibleState, setCollapsibleState] = useState({});
  const [analysisText, setAnalysisText] = useState("");
  const [analysisResult, setAnalysisResult] = useState("");
  const [mapMarkers, setMapMarkers] = useState([]);
  const [showSubmitProgressBar, setShowSubmitProgressBar] = useState(false);
  const [showAnalysisProgressBar, setShowAnalysisProgressBar] = useState(false);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/districts")
      .then((response) => {
        setDistricts(response.data);
        setSelectedDistrict(response.data[0] || "");
      })
      .catch((error) => console.error("Error fetching districts:", error));
  }, []);

  useEffect(() => {
    if (selectedDistrict) {
      axios
        .get(`http://localhost:5000/api/units/${selectedDistrict}`)
        .then((response) => {
          setUnits(response.data);
          setSelectedUnit(response.data[0] || "");
        })
        .catch((error) => console.error("Error fetching units:", error));
    }
  }, [selectedDistrict]);

  useEffect(() => {
    if (selectedUnit) {
      axios
        .get(`http://localhost:5000/api/beats/${selectedUnit}`)
        .then((response) => {
          setBeats(response.data);
          setSelectedBeat(response.data[0] || "");
        })
        .catch((error) => console.error("Error fetching beats:", error));
    }
  }, [selectedUnit]);

  const handleSubmit = () => {
    setShowSubmitProgressBar(true);
    if (selectedBeat) {
      axios
        .get(
          `http://localhost:5000/api/data-by-beat/${encodeURIComponent(
            selectedBeat
          )}`
        )
        .then((response) => {
          prepareChartData(response.data);
          prepareMapMarkers(response.data);
          setShowSubmitProgressBar(false);
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
          setShowSubmitProgressBar(false);
        });
    }
  };

  useEffect(() => {
    if (mapMarkers.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(
        mapMarkers.map((loc) => L.latLng(loc.lat, loc.long))
      );
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [mapMarkers]); // Depend on mapMarkers to ensure it runs after updates

  const prepareMapMarkers = (data) => {
    let latLongCount = {};
    data.forEach((crime) => {
      const key = `${crime.latitude}-${crime.longitude}`;
      if (
        crime.latitude &&
        crime.longitude &&
        crime.latitude !== "null" &&
        crime.longitude !== "null"
      ) {
        if (!latLongCount[key]) {
          latLongCount[key] = { count: 0, details: crime.Crime_Type };
        }
        latLongCount[key].count++;
      }
    });

    const sortedLocations = Object.entries(latLongCount)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map((item) => ({
        lat: parseFloat(item[0].split("-")[0]),
        long: parseFloat(item[0].split("-")[1]),
        detail: item[1].details,
        count: item[1].count, // Store the frequency count
      }))
      .filter((marker) => !isNaN(marker.lat) && !isNaN(marker.long)); // Filter out invalid markers

    setMapMarkers(sortedLocations);
  };

  const generateColor = () => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgba(${r}, ${g}, ${b}, 0.5)`;
  };

  const formatFieldName = (field) => {
    return field.replace(/_/g, " ").toLowerCase();
  };

  const prepareChartData = (data) => {
    const fields = [
      "place_of_offence",
      "actsection",
      "fir_type",
      "latitude",
      "longitude",
      "Crime_Type",
      "victim_profession",
      "victim_caste",
      "accused_profession",
      "accused_caste",
    ];
    let chartDataSets = fields.map((field) => {
      const countData = data.reduce((acc, curr) => {
        if (curr[field] !== "null") {
          acc[curr[field]] = (acc[curr[field]] || 0) + 1;
        }
        return acc;
      }, {});

      const labels = Object.keys(countData);
      const colors = labels.map(() => generateColor());

      return {
        field: field,
        labels: labels,
        countData: countData,
        datasets: [
          {
            label: `${formatFieldName(field)} Frequency`,
            data: Object.values(countData),
            backgroundColor: colors,
            borderColor: colors.map((color) => color.replace("0.5", "1")),
            borderWidth: 1,
            barThickness: 10,
            borderRadius: 5,
            borderSkipped: false,
          },
        ],
      };
    });

    setChartData(chartDataSets);
    const newCollapsibleState = {};
    chartDataSets.forEach(({ field }) => {
      newCollapsibleState[field] = true;
    });
    setCollapsibleState(newCollapsibleState);
  };

  useEffect(() => {
    if (chartData.length > 0) {
      generateAnalysisText(chartData);
    }
  }, [chartData]); // Dependency on chartData to ensure it runs after update

  const mapRef = useRef(null);

  const renderMap = () => {
    return (
      <MapContainer
        whenCreated={(mapInstance) => {
          mapRef.current = mapInstance;
        }}
        center={[14.5204, 75.7224]} // Center on Karnataka
        zoom={8}
        style={{ height: "400px", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {mapMarkers.map((marker, idx) => (
          <Marker key={idx} position={[marker.lat, marker.long]} icon={pinIcon}>
            <Tooltip>
              {`${marker.detail}: ${marker.count}`}{" "}
              {/* Display crime type and frequency */}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    );
  };

  const generateAnalysisText = (chartDataSets) => {
    let text = "";

    chartDataSets.forEach((chart, index) => {
      const { field, countData } = chart;
      const formattedField = formatFieldName(field);
      const sortedValues = Object.entries(countData).sort(
        (a, b) => b[1] - a[1]
      );
      const total = sortedValues.reduce((acc, [_, freq]) => acc + freq, 0);
      const topThreeValues = sortedValues.slice(0, 3);

      const topThreeText = topThreeValues
        .map(([value, freq], idx) => {
          const percentage = Math.floor((freq / total) * 100);
          return `${idx + 1}. ${value}: ${freq} (${percentage}% of total)`;
        })
        .join("; ");

      text += `${
        index + 1
      }) In the beat of ${selectedUnit} unit of ${selectedDistrict} district, the top 3 frequencies in ${formattedField} are: ${topThreeText}.\n`;
    });

    setAnalysisText(text); // Ensure this line is working as expected
    console.log({ analysisText });
  };

  const fetchAndDisplayAnalysis = () => {
    setShowAnalysisProgressBar(true);
    axios
      .post("http://localhost:8000/beatwise_analysis", {
        analysis_text: analysisText, // Correct variable name for the analysis text
        district: selectedDistrict,
        unit: selectedUnit,
        beat: selectedBeat,
      })
      .then((response) => {
        setAnalysisResult(response.data.analysis); // Assuming 'analysis' is the field in response
        setShowAnalysisProgressBar(false);
      })
      .catch((error) => {
        console.error("Error posting analysis:", error);
        setShowAnalysisProgressBar(false);
      });
  };

  const chartConfig = (data, chartType = "bar") => {
    const commonOptions = {
      responsive: true,
      plugins: {
        legend: {
          position: "top",
        },
      },
    };

    const barOptions = {
      ...commonOptions,
      scales: {
        x: {
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            display: false,
          },
        },
      },
    };

    return {
      type: chartType,
      options: chartType === "bar" ? barOptions : commonOptions,
      data: {
        labels: data.labels,
        datasets: data.datasets,
      },
    };
  };

  const renderChart = (data, field) => {
    const chartTypes = {
      actsection: "pie",
      place_of_offence: "pie",
    };
    const chartType = chartTypes[field] || "bar"; // Default to bar if not specified

    const ChartComponent = chartType === "pie" ? Pie : Bar;

    return <ChartComponent {...chartConfig(data, chartType)} />;
  };

  const toggleCollapse = (field) => {
    setCollapsibleState((prevState) => ({
      ...prevState,
      [field]: !prevState[field],
    }));
  };

  const renderCharts = () => {
    const pairedCharts = [];
    for (let i = 0; i < chartData.length; i += 2) {
      pairedCharts.push(chartData.slice(i, i + 2));
    }

    return pairedCharts.map((pair, index) => (
      <div key={index} className="flex flex-wrap -mx-2 mt-4">
        {pair.map((data) => (
          <div key={data.field} className="w-full md:w-1/2 px-2">
            <div className="p-5 m-2 backdrop-blur-sm bg-slate-900 shadow-lg shadow-indigo-900 rounded">
              <button
                onClick={() => toggleCollapse(data.field)}
                className="flex items-center font-bold text-lg pb-2 mb-2"
              >
                {collapsibleState[data.field] ? "►" : "▼"}{" "}
                {data.field.replace("_", " ")}
              </button>
              <div
                className={`${
                  collapsibleState[data.field] ? "hidden" : ""
                } p-4  rounded`}
              >
                {renderChart(data, data.field)}
              </div>
            </div>
          </div>
        ))}
      </div>
    ));
  };

  const renderAnalysisResult = () => {
    if (!analysisResult) {
      return "Click 'Get Detailed Analysis' to view the result.";
    }

    const paragraphs = analysisResult.split(
      /based on these observations|based on this analysis/i
    );
    return (
      <div>
        <p>{paragraphs[0]}</p>
        {paragraphs[1] && (
          <>
            <h4 className="text-2xl font-bold mt-4">Prediction:</h4>
            <p className="mt-2">Based on these observations{paragraphs[1]}</p>
          </>
        )}
      </div>
    );
  };


  return (
    <div className="container bg-gradient-to-b min-h-screen from-indigo-950 via-gray-800 to-stone-950 text-white mx-auto px-4 pt-4">
      <h2 className="text-3xl pt-1  font-bold  font-serif mb-1 ">
        Select District, Unit, and Beat for Analysis
      </h2>
      <p className="pb-7 text-lg ">
        Strategic Insights for Improved Police Patrolling
      </p>
      <div className="flex flex-wrap -mx-2 mb-4">
        <div className="w-1/3 px-2">
          <label
            htmlFor="district-select"
            className="block mb-2 text-sm font-medium text-white"
          >
            District:
          </label>
          <select
            id="district-select"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          >
            {districts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </div>
        <div className="w-1/3 px-2">
          <label
            htmlFor="unit-select"
            className="block mb-2 text-sm font-medium text-white"
          >
            Unit:
          </label>
          <select
            id="unit-select"
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            disabled={!selectedDistrict}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          >
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
        <div className="w-1/3 px-2">
          <label
            htmlFor="beat-select"
            className="block mb-2 text-sm font-medium text-white"
          >
            Beat:
          </label>
          <select
            id="beat-select"
            value={selectedBeat}
            onChange={(e) => setSelectedBeat(e.target.value)}
            disabled={!selectedUnit}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          >
            {beats.map((beat) => (
              <option key={beat} value={beat}>
                {beat}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full px-2 mt-4">
          <button
            onClick={handleSubmit}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Submit
          </button>
          {showSubmitProgressBar && (
            <div className="flex justify-center mt-4">
              <ProgressBar
                visible={true}
                height="80"
                width="80"
                color="#4fa94d"
                ariaLabel="progress-bar-loading"
                wrapperStyle={{}}
                wrapperClass=""
              />
            </div>
          )}
        </div>
      </div>
      {renderMap()}
      {renderCharts()}
      <div className="mt-2  border-rounded">
        <button
          onClick={fetchAndDisplayAnalysis}
          className="mt-4 inline-flex h-12 animate-shimmer items-center justify-center rounded-md border border-slate-700 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] px-6 font-medium text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50"
        >
          Get Analysis
        </button>
        {showAnalysisProgressBar && (
          <div className="flex justify-center mt-4">
            <ProgressBar
              visible={true}
              height="80"
              width="80"
              color="#4fa94d"
              ariaLabel="progress-bar-loading"
              wrapperStyle={{}}
              wrapperClass=""
            />
          </div>
        )}
        <div className="mt-4 pb-4">
          <h4 className="text-lg font-bold mb-2">Detailed Analysis Result:</h4>
          <div className="text-lg">{renderAnalysisResult()}</div>
        </div>
      </div>
    </div>
  );
};

export default BeatWiseAnalysis;
