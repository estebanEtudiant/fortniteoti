// ══════════════════════════════════════════════════════
//  GuidePage.h — Optimisations manuelles détaillées
// ══════════════════════════════════════════════════════
#pragma once
#include <QWidget>

class GuidePage : public QWidget {
    Q_OBJECT
public:
    explicit GuidePage(QWidget* parent = nullptr);
private:
    void buildUi();
};
