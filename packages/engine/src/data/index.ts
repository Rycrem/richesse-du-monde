import type { ActuCard, Cell, Company, GameConfig, Region } from "../types";
import actuJson from "./actu.json";
import boardJson from "./board.json";
import companiesJson from "./companies.json";
import configJson from "./config.json";
import regionsJson from "./regions.json";

export const companies = companiesJson as Company[];
export const regions = regionsJson as Region[];
export const board = boardJson as Cell[];
export const actuCards = actuJson as ActuCard[];
export const config = configJson as GameConfig;
