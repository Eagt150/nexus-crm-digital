# Guía de Contribución — NexusCRM

Gracias por tu interés en contribuir a NexusCRM. Este documento explica cómo hacerlo de forma ordenada.

---

## Código de conducta

Este proyecto sigue un estándar de respeto mutuo. Se espera que todos los colaboradores mantengan un tono profesional y constructivo en issues, PRs y comentarios.

---

## Cómo reportar un bug

1. Busca en [Issues existentes](../../issues) para evitar duplicados.
2. Abre un nuevo issue usando la plantilla **Bug Report**.
3. Incluye: descripción, pasos para reproducirlo, comportamiento esperado vs actual, y capturas de pantalla si aplica.

---

## Cómo proponer una nueva función

1. Abre un issue usando la plantilla **Feature Request**.
2. Describe el problema que resuelve y el valor que aporta.
3. Espera feedback antes de implementar.

---

## Flujo de trabajo para PRs

```bash
# 1. Haz fork del repositorio
# 2. Clona tu fork
git clone https://github.com/TU_USUARIO/nexus-crm-digital.git

# 3. Crea una rama descriptiva
git checkout -b feat/nombre-de-la-feature
# o
git checkout -b fix/descripcion-del-bug

# 4. Haz tus cambios y commitea
git add .
git commit -m "feat: descripción clara del cambio"

# 5. Sube tu rama
git push origin feat/nombre-de-la-feature

# 6. Abre un Pull Request hacia `master`
```

---

## Convención de commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

| Prefijo | Uso |
|---------|-----|
| `feat:` | Nueva funcionalidad |
| `fix:` | Corrección de bug |
| `style:` | Cambios de CSS/UI sin lógica |
| `refactor:` | Refactorización sin cambio de comportamiento |
| `docs:` | Solo documentación |
| `chore:` | Tareas de mantenimiento |

---

## Estándares de código

- **HTML**: semántico, indentado con 2 espacios
- **CSS**: usar variables CSS (`var(--token)`), evitar valores hardcoded
- **JS**: vanilla ES6+, sin frameworks, sin `var`
- No agregar dependencias externas sin discutirlo primero en un issue
- Mantener todo en un solo archivo `index.html` hasta que el proyecto escale a una arquitectura modular acordada

---

## ¿Tienes dudas?

Abre un issue con el label `question` y te responderemos lo antes posible.
