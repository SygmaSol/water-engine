import * as react from 'react';
import { R as RateSet, C as Category } from './types-FomQArgM.js';

interface CalculatorDictionary {
    title: string;
    intro: string;
    categoryLabel: string;
    categoryHelp: string;
    categories: {
        domestic_standard: string;
        domestic_reduced: string;
        industrial_tourist: string;
    };
    m3Label: string;
    m3Help: string;
    billerLabel: string;
    billerHelp: string;
    billers: {
        club: string;
        canal: string;
    };
    caliberLabel: string;
    caliberHelp: string;
    sewerLabel: string;
    sewerHelp: string;
    sewerOn: string;
    sewerOff: string;
    lossLabel: string;
    lossHelp: string;
    lossPlaceholder: string;
    versionLabel: string;
    versions: {
        current: string;
        proposed: string;
    };
    resultTitle: string;
    perPeriod: string;
    igicLine: string;
    totalLabel: string;
    proposedDelta: (delta: string) => string;
    blocksTitle: string;
    lossDisclaimer: string;
    estimateNote: string;
    sourceNote: string;
    lineLabels: {
        consumption: string;
        consumptionMerged: string;
        loss: string;
        water_quota: string;
        sanitation_fixed: string;
        sanitation_variable: string;
    };
}
declare const en: CalculatorDictionary;
declare const es: CalculatorDictionary;

interface BillCalculatorProps {
    dictionary: CalculatorDictionary;
    /** Rate sets loaded by the host (from the water_tariffs store; fixture as offline fallback). */
    rateSets: RateSet[];
    /** localStorage key for input persistence; omit to disable persistence (e.g. SSR harnesses). */
    persistKey?: string;
    defaultCategory?: Category;
    className?: string;
}
declare function BillCalculator({ dictionary: t, rateSets, persistKey, defaultCategory, className }: BillCalculatorProps): react.JSX.Element;

export { BillCalculator, type BillCalculatorProps, type CalculatorDictionary, en, es };
