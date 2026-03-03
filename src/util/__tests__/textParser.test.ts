import { parseAboutText } from '../textParser';

describe('textParser', () => {
  describe('parseAboutText', () => {
    it('should parse text with sections correctly', () => {
      const input = `## Section 1
This is content for section 1.

## Section 2
This is content for section 2.
More content here.`;

      const result = parseAboutText(input);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        title: 'Section 1',
        content: 'This is content for section 1.\n'
      });
      expect(result[1]).toEqual({
        title: 'Section 2',
        content: 'This is content for section 2.\nMore content here.\n'
      });
    });

    it('should handle empty string', () => {
      const input = '';
      const result = parseAboutText(input);
      expect(result).toEqual([]);
    });

    it('should handle text without sections', () => {
      const input = 'Just some regular text without sections';
      const result = parseAboutText(input);
      expect(result).toEqual([]);
    });

    it('should handle single section', () => {
      const input = `## Single Section
This is the content.`;
      
      const result = parseAboutText(input);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        title: 'Single Section',
        content: 'This is the content.\n'
      });
    });

    it('should handle section with empty content', () => {
      const input = `## Empty Section

## Another Section
Has content.`;
      
      const result = parseAboutText(input);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        title: 'Empty Section',
        content: ''
      });
      expect(result[1]).toEqual({
        title: 'Another Section',
        content: 'Has content.\n'
      });
    });
  });
}); 