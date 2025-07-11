"use client";

import { useState, useEffect } from "react";
import Head from "next/head";
import {
  FaVolumeUp,
  FaChevronDown,
  FaChevronUp,
  FaCheck,
  FaTimes,
  FaArrowLeft,
  FaArrowRight,
  FaEye,
} from "react-icons/fa";
import { useSwipeable } from "react-swipeable";
import { motion, AnimatePresence } from "framer-motion";

export default function VocabularyApp() {
  const [vocabulary, setVocabulary] = useState([]);
  const [filteredVocabulary, setFilteredVocabulary] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("word");
  const [filterType, setFilterType] = useState("all");
  const [sortOrder, setSortOrder] = useState("none");
  const [IsSortOrder, setIsSortOrder] = useState("none");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [oldMessage, setOldMessage] = useState();
  const [speechRate, setSpeechRate] = useState(0.7);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [voices, setVoices] = useState([]);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [isHovered, setIsHovered] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    word: true,
    meaning: true,
    pronunciation: true,
  });
  const [direction, setDirection] = useState(0);
  const [alwaysShowTooltips, setAlwaysShowTooltips] = useState(false);
  const [keyboardSelectedIndex, setKeyboardSelectedIndex] = useState(null);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentPage < totalPages) {
        setDirection(1);
        paginate(currentPage + 1);
      }
    },
    onSwipedRight: () => {
      if (currentPage > 1) {
        setDirection(-1);
        paginate(currentPage - 1);
      }
    },
    trackMouse: true,
    preventDefaultTouchmoveEvent: true,
    delta: 10,
  });

  const handleMouseEnter = (key) => {
    setIsHovered((prev) => ({ ...prev, [key]: true }));
  };

  const handleMouseLeave = (key) => {
    setIsHovered((prev) => ({ ...prev, [key]: false }));
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      const defaultVoice = availableVoices.find(
        (v) => v.lang === "en-US" || v.lang.startsWith("en-")
      );
      if (defaultVoice) setSelectedVoice(defaultVoice.name);
    };

    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();
    } else {
      setMessage({
        text: "Speech synthesis is not supported in your browser",
        type: "error",
      });
    }

    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let result = [...vocabulary];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const searchInField = searchField === "word" ? "word" : "meaning";
      const startsWith = result.filter((item) =>
        item[searchInField].toLowerCase().startsWith(term)
      );
      const includes = result.filter(
        (item) =>
          item[searchInField].toLowerCase().includes(term) &&
          !item[searchInField].toLowerCase().startsWith(term)
      );
      const otherField = searchField === "word" ? "meaning" : "word";
      const matchesInOtherField = result.filter(
        (item) =>
          item[otherField].toLowerCase().includes(term) &&
          !startsWith.some((i) => i.word === item.word) &&
          !includes.some((i) => i.word === item.word)
      );
      result = [...startsWith, ...includes, ...matchesInOtherField];
      if (oldMessage != searchTerm) setCurrentPage(1);
      setOldMessage(term);
    }
    if (filterType !== "all") {
      const isLearned = filterType === "learned";
      result = result.filter((item) => item.isLearn === isLearned);
    }
    if (sortOrder === "a-z" && !searchTerm) {
      result.sort((a, b) => a.word.localeCompare(b.word));
    } else if (sortOrder === "z-a") {
      result.sort((a, b) => b.word.localeCompare(a.word));
    } else if (sortOrder === "none" && sortOrder != IsSortOrder) {
      loadData();
    }
    setIsSortOrder(sortOrder);
    setFilteredVocabulary(result);
  }, [vocabulary, searchTerm, searchField, filterType, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType]);

  const totalPages = Math.ceil(filteredVocabulary.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredVocabulary.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const loadData = async () => {
    try {
      const context = require.context("../../jsons/", false, /\.json$/);
      const jsonFiles = context.keys().map(context);
      const combinedData = jsonFiles.reduce((acc, file) => {
        const data = file.default || file;
        return [...acc, ...(Array.isArray(data) ? data : [])];
      }, []);
      setVocabulary(combinedData);
      setFilteredVocabulary(combinedData);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading vocabulary data:", error);
      setMessage({ text: "Error loading vocabulary data", type: "error" });
      setIsLoading(false);
    }
  };

  const toggleLearnedStatus = async (word) => {
    try {
      const currentWord = vocabulary.find((w) => w.word === word);
      if (!currentWord)
        throw new Error(`Word "${word}" not found in local vocabulary`);
      const newStatus = !currentWord.isLearn;
      setVocabulary((prev) =>
        prev.map((item) =>
          item.word === word ? { ...item, isLearn: newStatus } : item
        )
      );
      setMessage({ text: `Updating "${word}" status...`, type: "info" });
      const response = await fetch("/api/update-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, isLearn: newStatus }),
      });
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Update failed");
        } else {
          const text = await response.text();
          throw new Error(text || `HTTP error! status: ${response.status}`);
        }
      }
      const result = await response.json();
      setMessage({ text: `"${word}" updated successfully!`, type: "success" });
    } catch (error) {
      console.error("Update error:", error);
      setVocabulary((prev) => [...prev]);
      setMessage({
        text: error.message || "Failed to update word status",
        type: "error",
      });
    } finally {
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    }
  };

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const speakText = (text) => {
    try {
      if (!("speechSynthesis" in window)) {
        throw new Error("Speech synthesis not supported");
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = speechRate;
      utterance.pitch = 1;
      utterance.volume = 1;

      if (selectedVoice && voices.length > 0) {
        const voice = voices.find((v) => v.name === selectedVoice);
        if (voice) utterance.voice = voice;
      }

      utterance.onerror = (event) => {
        if (event.error !== "interrupted") {
          console.error("SpeechSynthesis Error:", event.error);
          setMessage({
            text: "Error occurred during speech synthesis",
            type: "error",
          });
        }
      };

      utterance.onend = () => {
        console.log("Speech finished");
      };

      utterance.onboundary = (event) => {
        console.log(`Boundary reached at ${event.charIndex} characters`);
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Error in speakText:", error);
      setMessage({
        text: "Speech synthesis is not supported or failed",
        type: "error",
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft" && currentPage > 1) {
        setDirection(-1);
        paginate(currentPage - 1);
      } else if (e.key === "ArrowRight" && currentPage < totalPages) {
        setDirection(1);
        paginate(currentPage + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentPage, totalPages]);

  useEffect(() => {
    const handleNumberKeyPress = (e) => {
      const key = e.key;

      if (key === "0") {
        if (currentItems.length >= 10) {
          const wordToSpeak = currentItems[9].word;
          speakText(wordToSpeak);
        }
        return;
      }

      if (/^[1-9]$/.test(key)) {
        const number = parseInt(key);
        if (number <= currentItems.length) {
          const wordToSpeak = currentItems[number - 1].word;
          speakText(wordToSpeak);
        }
      }
    };

    window.addEventListener("keydown", handleNumberKeyPress);
    return () => {
      window.removeEventListener("keydown", handleNumberKeyPress);
    };
  }, [currentItems]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      const keyMap = {
        q: 1,
        w: 2,
        e: 3,
        r: 4,
        t: 5,
        y: 6,
        u: 7,
        i: 8,
        o: 9,
        p: 10,
      };

      if (e.key === " ") {
        e.preventDefault();
        setKeyboardSelectedIndex(null);
        return;
      }

      if (e.key == "z") {
        toggleSection("word");
        return;
      } else if (e.key == "x") {
        toggleSection("meaning");
        return;
      } else if (e.key == "c") {
        toggleSection("pronunciation");
        return;
      }

      if (keyMap[e.key] && keyMap[e.key] <= currentItems.length) {
        const index = keyMap[e.key] - 1;
        console.log(index);
        console.log(keyboardSelectedIndex);
        if (index == keyboardSelectedIndex) {
          setKeyboardSelectedIndex(-1);
        } else {
          setKeyboardSelectedIndex(index);
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [currentItems]);

  useEffect(() => {
    const handleCtrlNumberKeyPress = (e) => {
      if (e.ctrlKey) {
        let index = -1;

        if (/^[1-9]$/.test(e.key)) {
          index = parseInt(e.key) - 1;
        } else if (e.key === "0") {
          index = 9;
        }

        if (index !== -1 && index < currentItems.length) {
          const word = currentItems[index].word;
          toggleLearnedStatus(word);
        }

        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleCtrlNumberKeyPress);
    return () => {
      window.removeEventListener("keydown", handleCtrlNumberKeyPress);
    };
  }, [currentItems, toggleLearnedStatus]);

  const pageVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <Head>
        <title>Vocabulary Learning App</title>
        <meta name="description" content="Learn and manage your vocabulary" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </Head>

      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-2 sm:px-4 py-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center whitespace-nowrap overflow-hidden text-ellipsis">
            Vocabulary Learning App
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4" {...swipeHandlers}>
        {message.text && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm sm:text-base ${
              message.type === "error"
                ? "bg-red-100 text-red-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 md:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="xl:col-span-2">
              <label className="block text-xs sm:text-sm font-medium mb-1">
                Search
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={searchField}
                  onChange={(e) => setSearchField(e.target.value)}
                  className="flex-1 p-1 sm:p-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="word">Word</option>
                  <option value="meaning">Meaning</option>
                </select>
                <input
                  type="text"
                  placeholder={`Search ${searchField}...`}
                  className="flex-1 p-1 sm:p-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">
                Filter by
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full p-1 sm:p-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All words</option>
                <option value="learned">Learned words</option>
                <option value="unlearned">Unlearned words</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">
                Sort by
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full p-1 sm:p-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="a-z">A-Z</option>
                <option value="z-a">Z-A</option>
                <option value="none">Default</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">
                Items per page
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="w-full p-1 sm:p-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">
                Speech rate
              </label>
              <input
                type="range"
                min="0.3"
                max="1.5"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-xs sm:text-sm text-center mt-1">
                {speechRate.toFixed(1)}x
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">
                Voice
              </label>
              <select
                className="w-full p-1 sm:p-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedVoice || ""}
                onChange={(e) => setSelectedVoice(e.target.value)}
                disabled={voices.length === 0}
              >
                {voices.length === 0 ? (
                  <option value="">Loading voices...</option>
                ) : (
                  <>
                    <option value="">Default</option>
                    {voices
                      .filter((voice) => voice.lang.startsWith("en"))
                      .map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name
                            .replace("Microsoft ", "")
                            .replace("Google ", "")
                            .replace("Desktop ", "")}
                          ({voice.lang})
                        </option>
                      ))}
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-3 shadow">
            <h3 className="font-medium text-xs sm:text-sm text-blue-800 dark:text-blue-200">
              Total Words
            </h3>
            <p className="text-lg sm:text-xl md:text-2xl font-bold">
              {vocabulary.length}
            </p>
          </div>
          <div className="bg-green-100 dark:bg-green-900 rounded-lg p-3 shadow">
            <h3 className="font-medium text-xs sm:text-sm text-green-800 dark:text-green-200">
              Learned
            </h3>
            <p className="text-lg sm:text-xl md:text-2xl font-bold">
              {vocabulary.filter((word) => word.isLearn).length}
            </p>
          </div>
          <div className="bg-yellow-100 dark:bg-yellow-900 rounded-lg p-3 shadow">
            <h3 className="font-medium text-xs sm:text-sm text-yellow-800 dark:text-yellow-200">
              To Learn
            </h3>
            <p className="text-lg sm:text-xl md:text-2xl font-bold">
              {vocabulary.filter((word) => !word.isLearn).length}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
              <div className="grid grid-cols-12 bg-gray-100 dark:bg-gray-700 p-2 sm:p-3 md:p-4 text-xs sm:text-sm font-medium">
                <div className="col-span-5 sm:col-span-4 md:col-span-3 flex items-center">
                  <button
                    onClick={() => toggleSection("word")}
                    className="mr-1 sm:mr-2"
                  >
                    {expandedSections.word ? (
                      <FaChevronUp size={14} />
                    ) : (
                      <FaChevronDown size={14} />
                    )}
                  </button>
                  <span className="truncate">Word</span>
                </div>
                <div className="col-span-5 sm:col-span-4 md:col-span-3 flex items-center">
                  <button
                    onClick={() => toggleSection("meaning")}
                    className="mr-1 sm:mr-2"
                  >
                    {expandedSections.meaning ? (
                      <FaChevronUp size={14} />
                    ) : (
                      <FaChevronDown size={14} />
                    )}
                  </button>
                  <span className="truncate">Meaning</span>
                </div>
                <div className="col-span-2 sm:col-span-2 md:col-span-3 flex items-center">
                  <button
                    onClick={() => toggleSection("pronunciation")}
                    className="mr-1 sm:mr-2"
                  >
                    {expandedSections.pronunciation ? (
                      <FaChevronUp size={14} />
                    ) : (
                      <FaChevronDown size={14} />
                    )}
                  </button>
                  <span className="truncate">Pron.</span>
                </div>
                <div className="hidden sm:flex sm:col-span-2 md:col-span-3 items-center">
                  <span className="truncate">Status</span>
                </div>
              </div>

              {currentItems.length > 0 ? (
                <AnimatePresence custom={direction}>
                  <motion.div
                    key={currentPage}
                    custom={direction}
                    variants={pageVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      type: "tween",
                      ease: "easeInOut",
                      duration: 0.3,
                    }}
                  >
                    {currentItems.map((item, index) => (
                      <div
                        key={item.word + index}
                        className={`grid grid-cols-12 p-2 sm:p-3 md:p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm ${
                          keyboardSelectedIndex === index
                            ? "bg-blue-50 dark:bg-blue-900/30"
                            : ""
                        }`}
                      >
                        <div className="col-span-5 sm:col-span-4 md:col-span-3 font-medium flex items-center gap-1 sm:gap-2">
                          <button
                            onClick={() =>
                              setActiveTooltip(
                                activeTooltip === `word-${index}`
                                  ? null
                                  : `word-${index}`
                              )
                            }
                            onMouseEnter={() =>
                              handleMouseEnter(`word-${index}`)
                            }
                            onMouseLeave={() =>
                              handleMouseLeave(`word-${index}`)
                            }
                            className="relative group flex items-center focus:outline-none"
                          >
                            {expandedSections.word ? (
                              <span className="truncate">{item.word}</span>
                            ) : (
                              <>
                                <FaEye
                                  className="text-gray-500 hover:text-gray-700 cursor-pointer"
                                  size={20}
                                />
                                {(activeTooltip === `word-${index}` ||
                                  isHovered[`word-${index}`] ||
                                  keyboardSelectedIndex === index ||
                                  alwaysShowTooltips) && (
                                  <div className="absolute z-10 bg-gray-800 text-white text-base rounded py-1 px-2 bottom-full mb-1 whitespace-nowrap">
                                    {item.word}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-800"></div>
                                  </div>
                                )}
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => speakText(item.word)}
                            className="text-blue-500 hover:text-blue-700"
                            aria-label={`Speak ${item.word}`}
                            title="Speak"
                          >
                            <FaVolumeUp size={20} />
                          </button>
                        </div>

                        <div className="col-span-5 sm:col-span-4 md:col-span-3 flex items-center">
                          <button
                            onClick={() =>
                              setActiveTooltip(
                                activeTooltip === `meaning-${index}`
                                  ? null
                                  : `meaning-${index}`
                              )
                            }
                            onMouseEnter={() =>
                              handleMouseEnter(`meaning-${index}`)
                            }
                            onMouseLeave={() =>
                              handleMouseLeave(`meaning-${index}`)
                            }
                            className="relative group focus:outline-none"
                          >
                            {expandedSections.meaning ? (
                              <span className="truncate">{item.meaning}</span>
                            ) : (
                              <>
                                <FaEye
                                  className="text-gray-500 hover:text-gray-700 cursor-pointer"
                                  size={20}
                                />
                                {(activeTooltip === `meaning-${index}` ||
                                  isHovered[`meaning-${index}`] ||
                                  keyboardSelectedIndex === index ||
                                  alwaysShowTooltips) && (
                                  <div className="absolute z-10 bg-gray-800 text-white text-base rounded py-1 px-2 bottom-full mb-1 whitespace-nowrap">
                                    {item.meaning}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-800"></div>
                                  </div>
                                )}
                              </>
                            )}
                          </button>
                        </div>

                        <div className="col-span-2 sm:col-span-2 md:col-span-3 text-gray-600 dark:text-gray-400 flex items-center">
                          <button
                            onClick={() =>
                              setActiveTooltip(
                                activeTooltip === `pronunciation-${index}`
                                  ? null
                                  : `pronunciation-${index}`
                              )
                            }
                            onMouseEnter={() =>
                              handleMouseEnter(`pronunciation-${index}`)
                            }
                            onMouseLeave={() =>
                              handleMouseLeave(`pronunciation-${index}`)
                            }
                            className="relative group focus:outline-none"
                          >
                            {expandedSections.pronunciation ? (
                              <span className="truncate">
                                {item.pronunciation}
                              </span>
                            ) : (
                              <>
                                <FaEye
                                  className="text-gray-500 hover:text-gray-700 cursor-pointer"
                                  size={20}
                                />
                                {(activeTooltip === `pronunciation-${index}` ||
                                  isHovered[`pronunciation-${index}`] ||
                                  keyboardSelectedIndex === index ||
                                  alwaysShowTooltips) && (
                                  <div className="absolute z-10 bg-gray-800 text-white text-base rounded py-1 px-2 bottom-full mb-1 whitespace-nowrap">
                                    {item.pronunciation}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-800"></div>
                                  </div>
                                )}
                              </>
                            )}
                          </button>
                        </div>

                        <div className="col-span-12 sm:hidden mt-2">
                          <button
                            onClick={() => toggleLearnedStatus(item.word)}
                            className={`w-full px-2 py-1 rounded-full text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                              item.isLearn
                                ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800"
                                : "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
                            }`}
                          >
                            {item.isLearn ? (
                              <FaCheck size={10} />
                            ) : (
                              <FaTimes size={10} />
                            )}
                            {item.isLearn ? "Learned" : "To Learn"}
                          </button>
                        </div>

                        <div className="hidden sm:flex sm:col-span-2 md:col-span-3 items-center">
                          <button
                            onClick={() => toggleLearnedStatus(item.word)}
                            className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 ${
                              item.isLearn
                                ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800"
                                : "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
                            }`}
                          >
                            {item.isLearn ? (
                              <FaCheck size={10} />
                            ) : (
                              <FaTimes size={10} />
                            )}
                            {item.isLearn ? "Learned" : "To Learn"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="p-4 sm:p-6 md:p-8 text-center text-gray-500 text-sm sm:text-base">
                  No words found matching your criteria
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-1 sm:gap-2 flex-wrap mt-4">
                <button
                  onClick={() => {
                    setDirection(-1);
                    paginate(Math.max(1, currentPage - 1));
                  }}
                  disabled={currentPage === 1}
                  className="px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 disabled:opacity-50 flex items-center gap-1"
                >
                  <FaArrowLeft size={12} /> Prev
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => {
                        setDirection(pageNum > currentPage ? 1 : -1);
                        paginate(pageNum);
                      }}
                      className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm ${
                        currentPage === pageNum
                          ? "bg-blue-500 text-white"
                          : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => {
                    setDirection(1);
                    paginate(Math.min(totalPages, currentPage + 1));
                  }}
                  disabled={currentPage === totalPages}
                  className="px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 disabled:opacity-50 flex items-center gap-1"
                >
                  Next <FaArrowRight size={12} />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="bg-white dark:bg-gray-800 shadow-sm mt-6">
        <div className="container mx-auto px-4 py-4 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          © {new Date().getFullYear()} Vocabulary Learning App
        </div>
      </footer>
    </div>
  );
}
