// Location Parser Hook for parsing and validating location codes

import { useMemo, useCallback } from 'react';
import { ParsedLocation, LocationNode, LEVEL_CODES } from '../types';
import { parseLocationCode } from '../utils/positionCalculator';

interface UseLocationParserReturn {
  parseCode: (code: string) => ParsedLocation | null;
  formatCode: (parsed: ParsedLocation) => string;
  isValidCode: (code: string) => boolean;
  getRowFromCode: (code: string) => string | null;
  getLevelFromCode: (code: string) => string | null;
  getBayFromCode: (code: string) => number | null;
  getSideFromCode: (code: string) => number | null;
  buildCodeFromNode: (node: LocationNode) => string | null;
  allLevelCodes: readonly string[];
}

export function useLocationParser(): UseLocationParserReturn {
  // Parse a location code
  const parseCode = useCallback((code: string): ParsedLocation | null => {
    return parseLocationCode(code);
  }, []);

  // Format a parsed location back to code
  const formatCode = useCallback((parsed: ParsedLocation): string => {
    const bay = String(parsed.bay).padStart(2, '0');
    const side = String(parsed.side).padStart(2, '0');
    return `${parsed.row}${bay}${parsed.level}${side}`;
  }, []);

  // Check if a code is valid
  const isValidCode = useCallback((code: string): boolean => {
    return parseLocationCode(code) !== null;
  }, []);

  // Extract row from code
  const getRowFromCode = useCallback((code: string): string | null => {
    const parsed = parseLocationCode(code);
    return parsed?.row ?? null;
  }, []);

  // Extract level from code
  const getLevelFromCode = useCallback((code: string): string | null => {
    const parsed = parseLocationCode(code);
    return parsed?.level ?? null;
  }, []);

  // Extract bay from code
  const getBayFromCode = useCallback((code: string): number | null => {
    const parsed = parseLocationCode(code);
    return parsed?.bay ?? null;
  }, []);

  // Extract side from code
  const getSideFromCode = useCallback((code: string): number | null => {
    const parsed = parseLocationCode(code);
    return parsed?.side ?? null;
  }, []);

  // Build a code from a location node's complete_name
  const buildCodeFromNode = useCallback((node: LocationNode): string | null => {
    if (!node.parsed) return null;
    return formatCode(node.parsed);
  }, [formatCode]);

  // Memoize level codes
  const allLevelCodes = useMemo(() => LEVEL_CODES, []);

  return {
    parseCode,
    formatCode,
    isValidCode,
    getRowFromCode,
    getLevelFromCode,
    getBayFromCode,
    getSideFromCode,
    buildCodeFromNode,
    allLevelCodes,
  };
}
