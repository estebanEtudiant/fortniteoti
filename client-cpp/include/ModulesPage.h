// ══════════════════════════════════════════════════════
//  ModulesPage.h — Module grid with checkboxes
// ══════════════════════════════════════════════════════
#pragma once
#include <QWidget>
#include <QLabel>
#include <QCheckBox>
#include <QPushButton>
#include <QScrollArea>
#include <QVector>
#include "HoverCard.h"

class AppController;

class ModuleCard : public HoverCard {
    Q_OBJECT
public:
    ModuleCard(int idx, AppController* ctrl, QWidget* parent = nullptr);
    void refresh();  // re-read check results
    void playEntrance(int delayMs);

signals:
    void applyRequested(int idx);
    void enableChanged(int idx, bool en);

protected:
    void paintEvent(QPaintEvent*) override;

private:
    int            m_idx;
    AppController* m_ctrl;
    QCheckBox*     m_enabledCb  = nullptr;
    QLabel*        m_statusBadge= nullptr;
    QPushButton*   m_applyBtn   = nullptr;
};

class ModulesPage : public QWidget {
    Q_OBJECT
public:
    explicit ModulesPage(AppController* ctrl, QWidget* parent = nullptr);

public slots:
    void onChecksRefreshed();

private slots:
    void onRunningChanged(bool running, const QString&);
    void onSelectAll();
    void onDeselectAll();

private:
    AppController*       m_ctrl;
    QVector<ModuleCard*> m_cards;
    QLabel*              m_tweakCountLbl = nullptr;
    QPushButton*         m_runBtn        = nullptr;
    QWidget*             m_gridContainer = nullptr;

    void buildUi();
    void updateTweakCount();
};
