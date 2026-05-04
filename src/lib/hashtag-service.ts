
import React from 'react';

/**
 * @fileOverview Hashtag extraction and validation utility
 */

export function extractHashtags(text: string): string[] {
  if (!text) return [];
  // Regex to match # followed by Arabic or English characters
  const regex = /#[\u0600-\u06FFa-zA-Z][\u0600-\u06FF\w]*/g;
  const matches = text.match(regex) || [];
  
  // Clean, unique, and lowercased for indexing
  const uniqueTags = Array.from(new Set(matches))
    .filter(h => h.length > 1)
    .map(h => h.toLowerCase());
    
  return uniqueTags;
}

export function validateHashtagLimit(tags: string[]): boolean {
  return tags.length <= 10;
}

/**
 * وظيفة لتحويل الهاشتاقات في النص إلى روابط HTML
 * تم تعديلها لتستخدم React.createElement بدلاً من JSX لتجنب أخطاء الملفات .ts
 */
export function formatTextWithHashtags(text: string): (string | React.ReactNode)[] {
  if (!text) return [];
  const parts = text.split(/(#[\u0600-\u06FFa-zA-Z][\u0600-\u06FF\w]*)/g);
  
  return parts.map((part, i) => {
    if (part && part.startsWith('#')) {
      return React.createElement(
        'a',
        {
          key: i,
          href: `/hashtags/${encodeURIComponent(part)}`,
          className: "text-primary font-bold hover:underline"
        },
        part
      );
    }
    return part;
  });
}
