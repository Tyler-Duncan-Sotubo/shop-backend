"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateRendererService = void 0;
const common_1 = require("@nestjs/common");
const Handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");
let TemplateRendererService = class TemplateRendererService {
    constructor() {
        this.compiledTemplates = new Map();
    }
    onModuleInit() {
        this.loadTemplates();
    }
    loadTemplates() {
        const templatesDir = path.join(__dirname, '..', 'templates', 'hbs');
        const files = ['newsletter'];
        for (const name of files) {
            const filePath = path.join(templatesDir, `${name}.hbs`);
            if (!fs.existsSync(filePath)) {
                const altPath = path.join(process.cwd(), 'src', 'domains', 'email-marketing', 'templates', 'hbs', `${name}.hbs`);
                if (fs.existsSync(altPath)) {
                    const source = fs.readFileSync(altPath, 'utf-8');
                    this.compiledTemplates.set(name, Handlebars.compile(source));
                }
                continue;
            }
            const source = fs.readFileSync(filePath, 'utf-8');
            this.compiledTemplates.set(name, Handlebars.compile(source));
        }
    }
    render(templateName, data) {
        const template = this.compiledTemplates.get(templateName);
        if (!template) {
            throw new Error(`Template "${templateName}" not found. Make sure the .hbs file exists.`);
        }
        return template({
            ...data,
            year: new Date().getFullYear(),
            socialLinks: data.socialLinks
                ? this.parseSocialLinks(data.socialLinks)
                : null,
        });
    }
    parseSocialLinks(links) {
        if (!links)
            return null;
        if (typeof links === 'string') {
            try {
                return JSON.parse(links);
            }
            catch {
                return null;
            }
        }
        return links;
    }
};
exports.TemplateRendererService = TemplateRendererService;
exports.TemplateRendererService = TemplateRendererService = __decorate([
    (0, common_1.Injectable)()
], TemplateRendererService);
//# sourceMappingURL=template-renderer.service.js.map