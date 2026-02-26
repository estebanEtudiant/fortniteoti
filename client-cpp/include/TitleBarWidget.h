// ══════════════════════════════════════════════════════
//  TitleBarWidget.h — Custom 40px title bar
//  (logo, version, minimize, close)
// ══════════════════════════════════════════════════════
#pragma once
#include <QWidget>
#include <QPoint>

class TitleBarWidget : public QWidget {
    Q_OBJECT
public:
    explicit TitleBarWidget(QWidget* parent = nullptr);

signals:
    void closeRequested();
    void minimizeRequested();

protected:
    void paintEvent(QPaintEvent*) override;
    void mousePressEvent(QMouseEvent*) override;
    void mouseMoveEvent(QMouseEvent*) override;
    void mouseReleaseEvent(QMouseEvent*) override;
    void mouseDoubleClickEvent(QMouseEvent*) override;

private:
    bool   m_dragging  = false;
    QPoint m_dragStart;
};
