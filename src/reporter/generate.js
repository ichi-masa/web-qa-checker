import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { generateHtml } from './html-template.js';
import { generateMarkdown } from './markdown-template.js';

export async function generateReport(report, outputDir) {
  await mkdir(outputDir, { recursive: true });

  // HTML レポート生成
  const html = generateHtml(report);
  const htmlFilename = `${report.date}_qa-report.html`;
  const htmlFilepath = path.join(outputDir, htmlFilename);
  await writeFile(htmlFilepath, html, 'utf-8');
  console.log(`\n  HTMLレポート生成: ${htmlFilepath}`);

  // Markdown レポート生成
  const markdown = generateMarkdown(report);
  const mdFilename = `${report.date}_qa-report.md`;
  const mdFilepath = path.join(outputDir, mdFilename);
  await writeFile(mdFilepath, markdown, 'utf-8');
  console.log(`  Markdownレポート生成: ${mdFilepath}`);

  // HTMLファイルのパスを返す（ブラウザで開くため）
  return htmlFilepath;
}
